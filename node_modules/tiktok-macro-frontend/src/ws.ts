// Simple WS client with auto-retry
export type Mapping = Record<string, { key: string; durationMs: number }>;

type Listener = (msg: any) => void;

let socket: WebSocket | null = null;
const listeners: Listener[] = [];

export function connect(onMessage: Listener) {
  listeners.push(onMessage);
  openSocket();
}

function openSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) return;
  socket = new WebSocket('ws://localhost:5178');

  socket.onopen = () => {
    console.log('WS connected');
  };
  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data as string);
      listeners.forEach((l) => l(msg));
    } catch (e) {
      console.error('Bad WS message', e);
    }
  };
  socket.onclose = () => {
    console.log('WS closed; retry in 2s');
    setTimeout(openSocket, 2000);
  };
}

export function send(msg: any) {
  const data = JSON.stringify(msg);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(data);
  }
}


