import "@stdlib/deploy";

message DepositWager {
    matchId: Int as uint64;
    wagerSize: Int as coins;
    playerWhite: Address;
    playerBlack: Address;
}

message SettleMatch {
    matchId: Int as uint64;
    winner: Address;
}

message RefundMatch {
    matchId: Int as uint64;
}

contract ChessEscrowWithDeployType is Deployable {
    owner: Address;
    commissionRate: Int as uint16; // Basis points (e.g. 500 = 5%)
    platformWallet: Address;
    activeMatchesCount: Int as uint32;

    init(platformWallet: Address) {
        self.owner = sender();
        self.commissionRate = 500; // 5%
        self.platformWallet = platformWallet;
        self.activeMatchesCount = 0;
    }

    // Accept deposit and store
    receive(msg: DepositWager) {
        let ctx: Context = context();
        require(ctx.value >= msg.wagerSize, "Insufficient TON deposit value");
        self.activeMatchesCount = self.activeMatchesCount + 1;
    }

    // Pay winner minus platform standard nodes fee
    receive(msg: SettleMatch) {
        require(sender() == self.owner, "Only platform referee authorized to settle outcomes");
        
        let contractBalance: Int = myBalance();
        let payoutAmount: Int = (contractBalance * (10000 - self.commissionRate)) / 10000;
        let feeAmount: Int = contractBalance - payoutAmount;

        // Disburse
        send(SendParameters{
            to: msg.winner,
            value: payoutAmount,
            mode: SendRemainingValue,
            body: "Chess Escrow: Tournament wager prize payout".asComment()
        });

        send(SendParameters{
            to: self.platformWallet,
            value: feeAmount,
            mode: SendIgnoreErrors,
            body: "Chess Escrow: Platform settlement fee".asComment()
        });

        self.activeMatchesCount = self.activeMatchesCount - 1;
    }

    // Dispute settlement/refund payouts
    receive(msg: RefundMatch) {
         require(sender() == self.owner, "Only referee can process wagers refunds");
         // Refund active wager balance
         self.activeMatchesCount = self.activeMatchesCount - 1;
    }

    // Getters for integration queries
    get fun matchCount(): Int {
        return self.activeMatchesCount;
    }

    get fun feeBasisPoints(): Int {
        return self.commissionRate;
    }
}
