import React, { useState, useEffect } from 'react';
import CreateRoomCard from './components/CreateRoomCard';
import JoinRoomCard from './components/JoinRoomCard';
import LobbyRoomView from './components/LobbyRoomView';
import DraftingPhaseView from './components/DraftingPhaseView';
import { socket, createRoomSocket, joinRoomSocket, leaveRoomSocket } from './services/socket';
import { Gamepad2, Sparkles, LogIn, Swords } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('create');
  const [currentLobby, setCurrentLobby] = useState(null);
  const [inDraftPhase, setInDraftPhase] = useState(false);
  const [socketId, setSocketId] = useState(socket.id);
  const [serverTimer, setServerTimer] = useState(15);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    function onConnect() {
      setSocketId(socket.id);
    }

    function onRoomStateUpdated(roomData) {
      if (!roomData) {
        setCurrentLobby(null);
        setInDraftPhase(false);
        return;
      }

      const currentId = socket.id;

      const mapPlayer = (p) => ({
        ...p,
        isCurrentClient: p.socketId === currentId || p.id === currentId,
      });

      const updatedPlayers = (roomData.players || []).map(mapPlayer);

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
        draftState: updatedDraftState,
      };

      setCurrentLobby(updatedLobby);
      setInDraftPhase(roomData.inDraftPhase);
      if (roomData.remainingTime !== undefined) {
        setServerTimer(roomData.remainingTime);
      }
    }

    function onTurnTimerTick({ remainingTime }) {
      setServerTimer(remainingTime);
    }

    function onDraftStarted(roomData) {
      onRoomStateUpdated(roomData);
      setInDraftPhase(true);
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
      setInDraftPhase(false);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleResetLobby = () => {
    leaveRoomSocket();
    setCurrentLobby(null);
    setInDraftPhase(false);
  };

  return (
    <div className={`flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200 ${
      inDraftPhase ? 'h-screen h-dvh p-2 sm:p-3 overflow-hidden' : 'min-h-screen p-4 sm:p-6 lg:p-8'
    }`}>
      {/* Header Bar */}
      <header className={`max-w-6xl w-full mx-auto flex items-center justify-between border-b border-cyan-500/20 shrink-0 ${
        inDraftPhase ? 'py-1.5 mb-1.5' : 'py-4 mb-6'
      }`}>
        <div className="flex items-center gap-3">
          <img 
            src="/logo.svg" 
            alt="Draftout Logo" 
            className="w-10 h-10 object-contain shrink-0 [image-rendering:pixelated]" 
          />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-wider text-white flex items-center gap-2 leading-none">
              <span className="text-cyan-300 font-title text-2xl sm:text-3xl">DraftBoard</span>
              <span className="text-[10px] font-pixel bg-cyan-400/10 text-cyan-300 px-2 py-0.5 rounded border border-cyan-300/25 tracking-normal">
                WEB LOBBY
              </span>
            </h1>
            <p className="text-[11px] text-neutral-400 font-sans mt-0.5">Draftout Custom Board Drafter</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-cyan-300/80 bg-neutral-900 px-3 py-1.5 rounded-lg border border-cyan-400/20">
          <Gamepad2 className="w-4 h-4 text-cyan-400" />
          <span className="font-pixel text-[10px]">MINECRAFT DRAFTING ENGINE</span>
        </div>
      </header>

      {/* Main Content View */}
      <main className={`flex-1 flex items-center justify-center min-h-0 ${inDraftPhase ? 'my-0.5 overflow-hidden' : 'my-4'}`}>
        {currentLobby ? (
          inDraftPhase ? (
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
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-xs px-4 py-3 rounded-xl max-w-sm w-full text-center">
                {errorMessage}
              </div>
            )}

            {/* Tab Switcher */}
            <div className="bg-neutral-900 p-1.5 rounded-xl flex items-center gap-2 border border-cyan-500/30 max-w-sm w-full">
              <button
                onClick={() => { setActiveTab('create'); setErrorMessage(''); }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'create'
                    ? 'bg-cyan-400 text-neutral-950 font-bold'
                    : 'text-cyan-300/70 hover:text-cyan-200 hover:bg-neutral-800'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Create Room</span>
              </button>

              <button
                onClick={() => { setActiveTab('join'); setErrorMessage(''); }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'join'
                    ? 'bg-cyan-400 text-neutral-950 font-bold'
                    : 'text-cyan-300/70 hover:text-cyan-200 hover:bg-neutral-800'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Join Room</span>
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

      {/* Footer */}
      <footer className={`max-w-6xl w-full mx-auto text-center border-t border-cyan-500/10 text-xs text-neutral-500 shrink-0 ${
        inDraftPhase ? 'py-1 text-[10px]' : 'py-4 space-y-1'
      }`}>
        <div>DraftBoard &bull; Draftout Custom Board Drafter &bull; Not affiliated with DraftoutMC, Mojang or Microsoft</div>
      </footer>
    </div>
  );
}
