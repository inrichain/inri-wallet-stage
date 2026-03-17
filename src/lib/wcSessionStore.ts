type Listener = () => void;

export type PendingProposal = {
  id: number;
  proposerName: string;
  proposerUrl: string;
  proposerIcons: string[];
  requiredNamespaces: any;
  optionalNamespaces?: any;
  raw: any;
};

export type PendingSessionRequest = {
  topic: string;
  id: number;
  chainId: string;
  method: string;
  params: any;
  peerMetadata?: {
    name?: string;
    url?: string;
    icons?: string[];
  };
  raw: any;
};

type State = {
  proposal: PendingProposal | null;
  request: PendingSessionRequest | null;
};

const state: State = {
  proposal: null,
  request: null,
};

const listeners = new Set<Listener>();

function emit() {
  for (const cb of listeners) cb();
}

export function wcStoreSubscribe(cb: Listener) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function wcStoreGetState() {
  return state;
}

export function wcStoreSetProposal(proposal: PendingProposal | null) {
  state.proposal = proposal;
  emit();
}

export function wcStoreSetRequest(request: PendingSessionRequest | null) {
  state.request = request;
  emit();
}
