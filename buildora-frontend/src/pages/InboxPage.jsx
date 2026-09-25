import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, Check, CheckCheck, CircleAlert, Clock, ExternalLink, Inbox, MessageCircle, Search, Send } from 'lucide-react';
import { ErrorState, Spinner, EmptyState } from '../components/ui/Feedback';
import { useCurrentBusiness } from '../hooks/useCurrentBusiness';
import { useInterval } from '../hooks/useInterval';
import { useToast } from '../hooks/useToast';
import { inboxService } from '../services/inboxService';
import { whatsappService } from '../services/whatsappService';
import { cn } from '../utils/cn';
import { formatChatTime, formatDay, formatPhone, formatTime, initials } from '../utils/format';
import { REPLY_WINDOW_MS, whatsappLink } from '../utils/whatsapp';

const LIST_POLL_MS = 5000;
const CHAT_POLL_MS = 4000;

function Avatar({ customer, className }) {
  if (customer.profilePicture) return <img src={customer.profilePicture} alt="" className={cn('rounded-full object-cover', className)} />;
  return (
    <div className={cn('flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700', className)}>
      {initials(customer.name || customer.phone)}
    </div>
  );
}

const displayName = (c) => c.name || formatPhone(c.phone);

function StatusIcon({ message }) {
  switch (message.status) {
    case 'sending':
      return <Clock className="size-3.5" />;
    case 'delivered':
      return <CheckCheck className="size-3.5" />;
    case 'read':
      return <CheckCheck className="size-3.5 text-sky-500" />;
    case 'failed':
      return <span title={message.error}><CircleAlert className="size-3.5 text-red-500" /></span>;
    default:
      return <Check className="size-3.5" />;
  }
}

function ConversationList({ customers, loading, error, onRetry, selectedId, onSelect }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name?.toLowerCase().includes(q) || c.phone.includes(q.replace(/\D/g, '') || '@@'));
  }, [customers, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 p-4">
        <h1 className="mb-3 text-lg font-semibold">WhatsApp Inbox</h1>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or number"
            className="h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50 pr-3 pl-9 text-sm focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : !filtered.length ? (
          <EmptyState
            icon={Inbox}
            title={query ? 'No matches' : 'No conversations yet'}
            description={query ? undefined : 'When customers message your WhatsApp number, they will appear here.'}
          />
        ) : (
          <ul>
            {filtered.map((c) => (
              <li key={c._id}>
                <button
                  onClick={() => onSelect(c._id)}
                  className={cn(
                    'flex w-full items-center gap-3 border-b border-neutral-100 px-4 py-3 text-left transition-colors',
                    selectedId === c._id ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                  )}
                >
                  <Avatar customer={c} className="size-11 text-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn('truncate text-sm', c.unreadCount ? 'font-semibold' : 'font-medium')}>{displayName(c)}</span>
                      <span className={cn('shrink-0 text-xs', c.unreadCount ? 'font-medium text-whatsapp-dark' : 'text-neutral-400')}>
                        {formatChatTime(c.lastMessageAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className={cn('truncate text-sm', c.unreadCount ? 'text-neutral-800' : 'text-neutral-500')}>{c.lastMessage}</span>
                      {c.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-whatsapp px-1.5 text-xs font-semibold text-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const out = message.direction === 'outgoing';
  return (
    <div className={cn('flex', out ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-xs',
          out ? 'rounded-tr-sm bg-[#d9fdd3] text-neutral-900' : 'rounded-tl-sm bg-white text-neutral-900',
          message.status === 'failed' && 'ring-1 ring-red-300'
        )}
      >
        <p className="break-words whitespace-pre-wrap">{message.message}</p>
        <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-neutral-500">
          {formatTime(message.timestamp)}
          {out && <StatusIcon message={message} />}
        </div>
        {message.status === 'failed' && message.error && <p className="mt-1 text-xs text-red-600">{message.error}</p>}
      </div>
    </div>
  );
}

function Conversation({ business, customer, onBack, onSent }) {
  const toast = useToast();
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const nearBottom = useRef(true);
  const connected = business.whatsapp?.connected;

  const load = useCallback(async () => {
    try {
      const data = await inboxService.conversation(business._id, customer._id);
      // Keep optimistic "sending" bubbles until the server has them.
      setMessages((prev) => [...data.messages, ...(prev || []).filter((m) => m.status === 'sending')]);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [business._id, customer._id]);

  useEffect(() => {
    setMessages(null);
    setText('');
    nearBottom.current = true;
    load();
  }, [load]);

  useInterval(load, CHAT_POLL_MS);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && nearBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const lastIncoming = useMemo(
    () => [...(messages || [])].reverse().find((m) => m.direction === 'incoming'),
    [messages]
  );
  const outsideWindow = messages && (!lastIncoming || Date.now() - new Date(lastIncoming.timestamp) > REPLY_WINDOW_MS);

  async function send(e) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;

    const tempId = `temp-${Date.now()}`;
    const temp = { _id: tempId, direction: 'outgoing', message: body, status: 'sending', timestamp: new Date().toISOString() };
    nearBottom.current = true;
    setMessages((m) => [...(m || []), temp]);
    setText('');
    setSending(true);
    try {
      const saved = await whatsappService.send({ businessId: business._id, customerPhone: customer.phone, message: body });
      setMessages((m) => m.map((x) => (x._id === tempId ? saved : x)));
      onSent(customer._id, saved);
    } catch (err) {
      setMessages((m) => m.filter((x) => x._id !== tempId));
      setText((current) => current || body);
      toast.error(err);
    } finally {
      setSending(false);
    }
  }

  let lastDay = '';
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4">
        <button onClick={onBack} className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 md:hidden" aria-label="Back">
          <ArrowLeft className="size-5" />
        </button>
        <Avatar customer={customer} className="size-10 text-sm" />
        <div className="min-w-0">
          <div className="truncate font-semibold">{displayName(customer)}</div>
          <div className="truncate text-xs text-neutral-500">{formatPhone(customer.phone)}</div>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 space-y-2 overflow-y-auto bg-[#efeae2] px-4 py-4 sm:px-8"
      >
        {error && !messages ? (
          <ErrorState error={error} onRetry={load} />
        ) : !messages ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : !messages.length ? (
          <p className="py-10 text-center text-sm text-neutral-500">No messages yet.</p>
        ) : (
          messages.map((m) => {
            const day = formatDay(m.timestamp);
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <div key={m._id}>
                {showDay && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-lg bg-white/90 px-3 py-1 text-xs text-neutral-500 shadow-xs">{day}</span>
                  </div>
                )}
                <MessageBubble message={m} />
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 border-t border-neutral-200 bg-white p-3">
        {!connected ? (
          <p className="py-2 text-center text-sm text-neutral-500">
            WhatsApp is not connected. <Link to="/dashboard/whatsapp" className="font-medium text-brand-600 hover:underline">Connect WhatsApp</Link> to reply.
          </p>
        ) : (
          <>
            {outsideWindow && (
              <p className="mb-2 flex items-center gap-1.5 text-xs text-amber-700">
                <Clock className="size-3.5" /> Customer’s last message was over 24 hours ago — WhatsApp may reject free-form replies.
              </p>
            )}
            <form onSubmit={send} className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) send(e);
                }}
                rows={1}
                maxLength={4096}
                placeholder="Type a message..."
                className="max-h-40 min-h-10 flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:outline-none field-sizing-content"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-whatsapp px-4 text-sm font-medium text-white hover:bg-[#1fb855] disabled:opacity-50"
              >
                <Send className="size-4" /> Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function CustomerInfo({ customer }) {
  return (
    <aside className="hidden w-72 shrink-0 border-l border-neutral-200 bg-white xl:block">
      <div className="flex flex-col items-center border-b border-neutral-100 px-6 py-8 text-center">
        <Avatar customer={customer} className="size-20 text-xl" />
        <div className="mt-3 font-semibold">{displayName(customer)}</div>
        <div className="text-sm text-neutral-500">{formatPhone(customer.phone)}</div>
      </div>
      <dl className="space-y-4 p-6 text-sm">
        <div>
          <dt className="text-neutral-500">Customer since</dt>
          <dd>{new Date(customer.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Last message</dt>
          <dd>{customer.lastMessageAt ? new Date(customer.lastMessageAt).toLocaleString() : '—'}</dd>
        </div>
      </dl>
      <div className="px-6">
        <a
          href={whatsappLink(customer.phone)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-whatsapp-dark hover:underline"
        >
          <ExternalLink className="size-4" /> Open in WhatsApp
        </a>
      </div>
    </aside>
  );
}

export default function InboxPage() {
  const { business } = useCurrentBusiness();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('c');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCustomers = useCallback(async () => {
    try {
      setCustomers(await inboxService.customers(business._id));
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [business._id]);

  useEffect(() => {
    setLoading(true);
    loadCustomers();
  }, [loadCustomers]);
  useInterval(loadCustomers, LIST_POLL_MS);

  const selected = customers.find((c) => c._id === selectedId);

  // Opening a conversation (or new messages arriving in the open one) marks it read.
  useEffect(() => {
    if (!selected?.unreadCount) return;
    setCustomers((list) => list.map((c) => (c._id === selected._id ? { ...c, unreadCount: 0 } : c)));
    inboxService.markRead(business._id, selected._id).catch((err) => toast.error(err));
  }, [business._id, selected?._id, selected?.unreadCount, toast]);

  const select = (id) => setParams(id ? { c: id } : {}, { replace: !id });

  const handleSent = useCallback((customerId, message) => {
    setCustomers((list) =>
      list
        .map((c) => (c._id === customerId ? { ...c, lastMessage: message.message, lastMessageAt: message.timestamp } : c))
        .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
    );
  }, []);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] bg-white lg:h-dvh">
      <div className={cn('w-full shrink-0 border-r border-neutral-200 md:w-80', selected && 'hidden md:block')}>
        <ConversationList
          customers={customers}
          loading={loading}
          error={error}
          onRetry={loadCustomers}
          selectedId={selectedId}
          onSelect={select}
        />
      </div>

      {selected ? (
        <>
          <Conversation key={selected._id} business={business} customer={selected} onBack={() => select(null)} onSent={handleSent} />
          <CustomerInfo customer={selected} />
        </>
      ) : (
        <div className="hidden flex-1 items-center justify-center bg-neutral-50 md:flex">
          <EmptyState
            icon={MessageCircle}
            title={business.whatsapp?.connected ? 'Select a conversation' : 'WhatsApp not connected'}
            description={
              business.whatsapp?.connected
                ? 'Choose a customer on the left to read and reply.'
                : 'Connect your WhatsApp Business number to start receiving customer messages.'
            }
            action={
              !business.whatsapp?.connected && (
                <Link to="/dashboard/whatsapp" className="text-sm font-medium text-brand-600 hover:underline">Connect WhatsApp →</Link>
              )
            }
          />
        </div>
      )}
    </div>
  );
}
