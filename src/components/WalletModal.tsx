import React, { useState, useEffect } from "react";
import { 
  Wallet, 
  Shield, 
  CheckCircle, 
  Smartphone, 
  Coins, 
  RefreshCw, 
  QrCode, 
  ArrowRight, 
  ExternalLink,
  Laptop,
  Check
} from "lucide-react";
import { GameWagerPreset } from "../types";

interface WalletModalProps {
  balanceTON: number;
  starsCount: number;
  currentWager: GameWagerPreset;
  onWagerChange: (w: GameWagerPreset) => void;
  onWalletStatusChange: (connected: boolean, address: string | null) => void;
  onFaucetClaim?: () => void;
}

export default function WalletModal({
  balanceTON,
  starsCount,
  currentWager,
  onWagerChange,
  onWalletStatusChange,
  onFaucetClaim
}: WalletModalProps) {
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [bridgeLogs, setBridgeLogs] = useState<string[]>([]);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [selectedWalletProvider, setSelectedWalletProvider] = useState<string | null>(null);

  // Initialize from storage on mount to persist wallet link
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedConnected = localStorage.getItem("tonkeeper_connected_status");
      const storedAddress = localStorage.getItem("tonkeeper_wallet_address");
      const storedProvider = localStorage.getItem("tonkeeper_provider");
      
      if (storedConnected === "true" && storedAddress) {
        setWalletConnected(true);
        setWalletAddress(storedAddress);
        setSelectedWalletProvider(storedProvider || "Tonkeeper");
        onWalletStatusChange(true, storedAddress);
      }
    }
  }, []);

  const startConnectFlow = (provider: string) => {
    setConnectingProvider(provider);
    setShowQRModal(true);
    setBridgeLogs([
      "🔋 Инициализация защищенного моста TON Connect v2.4...",
      "🔗 Генерация уникального UUID сессии сопряжения...",
    ]);

    // Animate bridge logs
    setTimeout(() => {
      setBridgeLogs(prev => [...prev, "🧬 Запрос полезной нагрузки получен от dApp TON Chess Arena..."]);
    }, 800);

    setTimeout(() => {
      setBridgeLogs(prev => [...prev, "⏳ Ожидание сканирования QR-кода приложением Tonkeeper..."]);
    }, 1600);
  };

  const simulateSuccessConnect = () => {
    setBridgeLogs(prev => [...prev, "💡 Код успешно отсканирован устройством!"]);
    
    setTimeout(() => {
      setBridgeLogs(prev => [...prev, "🔑 Авторизация открытых ключей и адреса в сети TON..."]);
    }, 600);

    setTimeout(() => {
      const addressHex = "EQA" + Math.random().toString(36).slice(2, 10).toUpperCase() + "_" + Math.random().toString(36).slice(2, 10).toUpperCase() + "vS07";
      setWalletAddress(addressHex);
      setWalletConnected(true);
      setSelectedWalletProvider(connectingProvider || "Tonkeeper");
      
      localStorage.setItem("tonkeeper_connected_status", "true");
      localStorage.setItem("tonkeeper_wallet_address", addressHex);
      localStorage.setItem("tonkeeper_provider", connectingProvider || "Tonkeeper");

      onWalletStatusChange(true, addressHex);
      setShowQRModal(false);
      setConnectingProvider(null);
    }, 1500);
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress(null);
    setSelectedWalletProvider(null);
    localStorage.removeItem("tonkeeper_connected_status");
    localStorage.removeItem("tonkeeper_wallet_address");
    localStorage.removeItem("tonkeeper_provider");
    onWalletStatusChange(false, null);
  };

  const wagerPresets: GameWagerPreset[] = [0, 1, 5, 10, 25, 100];

  return (
    <div className="w-full rounded-2xl bg-zinc-900/30 border border-white/5 p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-400">
            <Wallet className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">Tonkeeper Кошелек</h3>
        </div>
        {walletConnected && (
          <span className="text-[10px] uppercase font-bold text-blue-400 px-3 py-1 bg-blue-500/10 rounded-full flex items-center gap-1.5 border border-blue-500/20">
            <Check className="w-3 h-3" /> Активен
          </span>
        )}
      </div>

      {!walletConnected ? (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Подключите <span className="text-blue-400 font-bold">Tonkeeper</span> для ставок и безопасного хранения игровых токенов через смарт-контракты TON.
          </p>
          
          {/* Main Tonkeeper primary button */}
          <button
            onClick={() => startConnectFlow("Tonkeeper")}
            className="w-full p-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-between transition-all shadow-lg group relative overflow-hidden cursor-pointer border border-blue-500/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black/20 rounded-xl flex items-center justify-center text-white text-xl">
                💎
              </div>
              <div className="text-left">
                <span className="text-sm font-black block tracking-wide">Подключить Tonkeeper</span>
                <span className="text-[10px] font-medium text-white/70 uppercase">TON Connect v2</span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-200 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Linked Wallet stats */}
          <div className="p-5 rounded-2xl bg-zinc-950/50 border border-white/5 flex flex-col gap-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500 font-bold uppercase">Адрес</span>
              <span className="text-blue-400 font-mono text-[10px] sm:text-xs truncate max-w-[140px] sm:max-w-xs" title={walletAddress || ""}>
                {walletAddress}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500 font-bold uppercase border-b border-white/5 pb-2">Баланс TON</span>
              <span className="text-sm sm:text-base font-black font-mono text-emerald-400 flex items-center gap-1 border-b border-white/5 pb-2">
                <Coins className="w-4 h-4" /> {balanceTON.toFixed(2)}
              </span>
            </div>

            {onFaucetClaim && (
              <button
                type="button"
                onClick={onFaucetClaim}
                className="mt-1 w-full py-2.5 text-xs font-bold font-mono text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                💧 Получить +50.0 TON (Тест)
              </button>
            )}
          </div>

          {/* Betting Setup presets */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">Размер Ставки (TON)</span>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {wagerPresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => onWagerChange(preset)}
                  className={`py-3 sm:py-4 rounded-xl border-2 text-sm font-black transition-all cursor-pointer font-mono ${
                    currentWager === preset
                      ? "bg-emerald-500 text-neutral-950 border-emerald-500 shadow-lg scale-[1.03]"
                      : "bg-zinc-900/50 text-zinc-400 border-white/5 hover:border-zinc-700 hover:text-zinc-100 opacity-90"
                  }`}
                >
                  {preset === 0 ? "НОЛЬ" : preset}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={disconnectWallet}
            className="w-full py-3 text-xs text-red-500/70 hover:text-red-400 font-bold bg-red-500/5 hover:bg-red-500/10 transition-colors rounded-xl flex items-center justify-center cursor-pointer uppercase tracking-widest mt-2"
          >
            Отключить кошелек
          </button>
        </div>
      )}

      {/* Tonkeeper Bridge interactive QR Popup overlay */}
      {showQRModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-[32px] bg-zinc-900 border border-zinc-800 p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center gap-5">
            
            <div className="flex justify-between items-center w-full pb-2">
              <div className="flex items-center gap-2">
                 <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                 <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">{connectingProvider}</span>
              </div>
              <button 
                onClick={() => {
                  setShowQRModal(false);
                  setConnectingProvider(null);
                }}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-zinc-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <h3 className="text-xl font-bold text-white mt-2 font-sans tracking-tight leading-tight">
              Отсканируйте код<br/><span className="text-zinc-400">в кошельке</span>
            </h3>

            {/* Simulated premium QR code */}
            <div className="relative p-5 rounded-[24px] bg-white shadow-[0_0_40px_rgba(59,130,246,0.3)] mt-2">
              <QrCode className="w-48 h-48 text-black" strokeWidth={1.2} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl border-4 border-white">
                  💎
                </div>
              </div>
            </div>

            <button
              onClick={simulateSuccessConnect}
              className="mt-6 w-full py-4 bg-zinc-100 hover:bg-white text-zinc-900 font-bold rounded-2xl text-sm flex items-center justify-center shadow-lg transition-colors cursor-pointer uppercase tracking-widest"
            >
              Имитировать Вход
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
