import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, SystemMessage } from '@ascendant/ui';
import { ASK_SYSTEM_SUGGESTED_PROMPTS } from '@ascendant/llm';
import { useAskSystem } from '../hooks/useAskSystem';
import { useRecentSystemMessages } from '../hooks/useHistory';
import { useProfile } from '../hooks/useProfile';
import { renderMessage } from '../system/messages';

/** Status > System — spec 10.8: feed + Ask the System chat. */
export function StatusSystem() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: feed } = useRecentSystemMessages(20);
  const { messages, pending, ask } = useAskSystem();
  const [question, setQuestion] = useState('');

  const submit = async (text: string) => {
    if (!text.trim() || pending) return;
    setQuestion('');
    await ask(text.trim());
  };

  return (
    <div className="max-w-[1000px] mx-auto px-2 py-6 flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate('/status')}
        className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted self-start hover:text-text"
      >
        &larr; Back to Status
      </button>
      <div className="grid grid-cols-2 gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="font-display text-[22px] font-bold a-heading">System feed</h1>
        <div className="rounded-lg border border-rule bg-bg p-2">
          {(feed ?? []).map((m) => (
            <SystemMessage
              key={m.id}
              kind={m.kind}
              time={new Date(m.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              text={renderMessage(m.templateKey, profile?.tone ?? 'neutral', m.params as Record<string, string | number>)}
            />
          ))}
          {(!feed || feed.length === 0) && <p className="text-text-muted p-2">Nothing yet.</p>}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h1 className="font-display text-[22px] font-bold a-heading">Ask the System</h1>
        <div className="flex-1 rounded-lg border border-rule bg-bg p-3 flex flex-col gap-2 min-h-[240px]">
          {messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'self-end max-w-[80%]' : 'self-start max-w-[80%]'}>
              <p
                className={
                  m.role === 'user'
                    ? 'bg-accent text-on-accent rounded-md px-3 py-2 text-[13px]'
                    : 'bg-surface rounded-md px-3 py-2 text-[13px]'
                }
              >
                {m.text}
              </p>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-text-muted text-[13px]">Try asking:</p>
              {ASK_SYSTEM_SUGGESTED_PROMPTS.map((p) => (
                <Button key={p} variant="default" onClick={() => submit(p)}>
                  {p}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit(question);
            }}
            placeholder="Ask about your progress…"
            disabled={pending}
            className="flex-1 h-touch rounded-md border border-rule bg-surface px-3 font-display text-[14px]"
          />
          <Button variant="primary" onClick={() => submit(question)} disabled={pending}>
            {pending ? '…' : 'ASK'}
          </Button>
        </div>
      </section>
      </div>
    </div>
  );
}
