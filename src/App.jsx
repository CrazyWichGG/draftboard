import React, { useState, useEffect } from 'react';
import CreateRoomCard from './components/CreateRoomCard';
import JoinRoomCard from './components/JoinRoomCard';
import LobbyRoomView from './components/LobbyRoomView';
import BanPhaseView from './components/BanPhaseView';
import DraftingPhaseView from './components/DraftingPhaseView';
import { socket, createRoomSocket, joinRoomSocket, leaveRoomSocket } from './services/socket';
import { Gamepad2, Sparkles, LogIn, Swords, Github } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('create');
  const [currentLobby, setCurrentLobby] = useState(null);
  const [inBanPhase, setInBanPhase] = useState(false);
  const [inDraftPhase, setInDraftPhase] = useState(false);
  const [socketId, setSocketId] = useState(socket.id);
  const [serverTimer, setServerTimer] = useState(10);
  const [errorMessage, setErrorMessage] = useState('');

  const isMatchActive = inBanPhase || inDraftPhase;

  useEffect(() => {
    function onConnect() {
      setSocketId(socket.id);
    }

    function onRoomStateUpdated(roomData) {
      if (!roomData) {
        setCurrentLobby(null);
        setInBanPhase(false);
        setInDraftPhase(false);
        return;
      }

      const currentId = socket.id;

      const mapPlayer = (p) => ({
        ...p,
        isCurrentClient: p.socketId === currentId || p.id === currentId,
      });

      const updatedPlayers = (roomData.players || []).map(mapPlayer);

      let updatedBanState = roomData.banState;
      if (updatedBanState && updatedBanState.players) {
        updatedBanState = {
          ...updatedBanState,
          players: updatedBanState.players.map(mapPlayer),
        };
      }

      let updatedDraftState = roomData.draftState;
      if (updatedDraftState && updatedDraftState.players) {
        updatedDraftState = {
          ...updatedDraftState,
          players: updatedDraftState.players.map(mapPlayer),
        };
      }

      const updatedLobby = {
        ...roomData,
        players: updatedPlayers,
        banState: updatedBanState,
        draftState: updatedDraftState,
      };

      setCurrentLobby(updatedLobby);
      setInBanPhase(Boolean(roomData.inBanPhase));
      setInDraftPhase(Boolean(roomData.inDraftPhase));
      if (roomData.remainingTime !== undefined) {
        setServerTimer(roomData.remainingTime);
      }
    }

    function onTurnTimerTick({ remainingTime }) {
      setServerTimer(remainingTime);
    }

    function onDraftStarted(roomData) {
      onRoomStateUpdated(roomData);
    }

    socket.on('connect', onConnect);
    socket.on('room_state_updated', onRoomStateUpdated);
    socket.on('turn_timer_tick', onTurnTimerTick);
    socket.on('draft_started', onDraftStarted);

    if (socket.connected) {
      setSocketId(socket.id);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('room_state_updated', onRoomStateUpdated);
      socket.off('turn_timer_tick', onTurnTimerTick);
      socket.off('draft_started', onDraftStarted);
    };
  }, []);

  const handleCreateRoom = async (data) => {
    setErrorMessage('');
    try {
      const room = await createRoomSocket(data);
      const currentId = socket.id;
      const mapPlayer = (p) => ({
        ...p,
        isCurrentClient: p.socketId === currentId || p.id === currentId,
      });

      const updatedPlayers = (room.players || []).map(mapPlayer);
      let updatedDraftState = room.draftState;
      if (updatedDraftState && updatedDraftState.players) {
        updatedDraftState = {
          ...updatedDraftState,
          players: updatedDraftState.players.map(mapPlayer),
        };
      }

      setCurrentLobby({ ...room, players: updatedPlayers, draftState: updatedDraftState });
      setInBanPhase(false);
      setInDraftPhase(false);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleJoinRoom = async (data) => {
    setErrorMessage('');
    try {
      const room = await joinRoomSocket(data);
      const currentId = socket.id;
      const mapPlayer = (p) => ({
        ...p,
        isCurrentClient: p.socketId === currentId || p.id === currentId,
      });

      const updatedPlayers = (room.players || []).map(mapPlayer);
      let updatedDraftState = room.draftState;
      if (updatedDraftState && updatedDraftState.players) {
        updatedDraftState = {
          ...updatedDraftState,
          players: updatedDraftState.players.map(mapPlayer),
        };
      }

      setCurrentLobby({ ...room, players: updatedPlayers, draftState: updatedDraftState });
      setInBanPhase(false);
      setInDraftPhase(false);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleResetLobby = () => {
    leaveRoomSocket();
    setCurrentLobby(null);
    setInBanPhase(false);
    setInDraftPhase(false);
  };

  return (
    <div className={`flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200 ${
      isMatchActive ? 'h-screen h-dvh p-2 sm:p-3 overflow-hidden' : 'min-h-screen p-4 sm:p-6 lg:p-8'
    }`}>
      {/* Header Bar */}
      <header className={`max-w-6xl w-full mx-auto flex items-center justify-between border-b border-cyan-500/20 shrink-0 ${
        isMatchActive ? 'py-1.5 mb-1.5' : 'py-4 mb-6'
      }`}>
        <div className="flex items-center gap-3.5">
          <img
            src="/logo.svg"
            alt="Draftout Logo"
            className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 object-contain shrink-0 [image-rendering:pixelated]"
          />
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-title font-bold tracking-wider text-white leading-none">
              DraftBoard
            </h1>
            <p className="text-[11px] text-neutral-400 font-sans mt-1">Custom Board Drafter for Draftout v1.15.1</p>
          </div>
        </div>

        <a
          href="https://github.com/CrazyWichGG/draftboard"
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 sm:w-11 sm:h-11 bg-[#121215]/65 hover:bg-[#18181b]/80 border border-neutral-700/60 hover:border-neutral-400/80 backdrop-blur-[4px] text-white hover:text-neutral-100 transition-all duration-200 flex items-center justify-center shrink-0 shadow-sm select-none"
        >
          <Github className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
        </a>
      </header>

      {/* Main Content View */}
      <main className={`flex-1 flex items-center justify-center min-h-0 ${isMatchActive ? 'my-0.5 overflow-hidden' : 'my-4'}`}>
        {currentLobby ? (
          inBanPhase ? (
            <BanPhaseView
              lobbyData={currentLobby}
              serverTimer={serverTimer}
              onResetLobby={handleResetLobby}
            />
          ) : inDraftPhase ? (
            <DraftingPhaseView
              lobbyData={currentLobby}
              serverTimer={serverTimer}
              onResetLobby={handleResetLobby}
            />
          ) : (
            <LobbyRoomView
              lobbyData={currentLobby}
              onLeaveLobby={handleResetLobby}
            />
          )
        ) : (
          <div className="flex flex-col items-center w-full space-y-6">
            {/* Glowing Slider Tab Switcher */}
            <div className="relative bg-neutral-900/90 p-1.5 flex items-center border border-cyan-500/30 max-w-sm w-full shadow-inner overflow-hidden">
              {/* Sliding Glowing Background Pill */}
              <div
                className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-cyan-400 tab-slider-glow transition-all duration-300 ease-out"
                style={{
                  left: activeTab === 'create' ? '6px' : 'calc(50% + 0px)',
                }}
              />

              <button
                type="button"
                onClick={() => { setActiveTab('create'); setErrorMessage(''); }}
                className={`relative z-10 flex-1 py-2.5 px-3 font-bold flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer ${activeTab === 'create'
                  ? 'text-neutral-950 font-extrabold'
                  : 'text-white hover:text-cyan-200'
                  }`}
              >
                <Sparkles className={`w-4 h-4 transition-transform ${activeTab === 'create' ? 'scale-110' : ''}`} />
                <span className="font-pixel text-xs sm:text-sm uppercase tracking-wider">Create Room</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('join'); setErrorMessage(''); }}
                className={`relative z-10 flex-1 py-2.5 px-3 font-bold flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer ${activeTab === 'join'
                  ? 'text-neutral-950 font-extrabold'
                  : 'text-white hover:text-cyan-200'
                  }`}
              >
                <LogIn className={`w-4 h-4 transition-transform ${activeTab === 'join' ? 'scale-110' : ''}`} />
                <span className="font-pixel text-xs sm:text-sm uppercase tracking-wider">Join Room</span>
              </button>
            </div>

            {/* Selected Form Card */}
            {activeTab === 'create' ? (
              <CreateRoomCard onCreateRoom={handleCreateRoom} errorMessage={errorMessage} />
            ) : (
              <JoinRoomCard onJoinRoom={handleJoinRoom} errorMessage={errorMessage} />
            )}
          </div>
        )}
      </main>

      {/* Footer (Hidden completely during active match phase) */}
      {!isMatchActive && (
        <footer className="max-w-6xl w-full mx-auto text-center border-t border-cyan-500/10 text-xs text-neutral-500 shrink-0 pt-6">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <span>Made by</span>
              <a className="font-bold hover:underline" href="https://github.com/CrazyWichGG" target="_blank" rel="noopener noreferrer">CrazyWichGG</a>
              <span>for the community</span>
            </span>
            <span className="text-neutral-600 select-none">•</span>
            <span>Not affiliated with DraftoutMC, Mojang, or Microsoft</span>
          </div>
        </footer>
      )}
    </div>
  );
}

