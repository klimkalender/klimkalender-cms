import { useState } from 'react'
import { Loader2, SquarePlay } from 'lucide-react'
import { Button, Notification } from '@mantine/core'
import { readLastBoulderBotAction, supabase } from '@/data/supabase'
import type { Database } from '@/database.types'

export type BoulderbotButtonProps = {
  onComplete?: React.Dispatch<React.SetStateAction<{
    details: string | null;
    end: string | null;
    id: number;
    result_ok: boolean | null;
    start: string;
    type: Database["public"]["Enums"]["action_type"];
    user_email: string;
} | null | undefined>>  ;
}

export default function RunBoulderbotButton({ onComplete }: BoulderbotButtonProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const handleRunBoulderBot = async () => {
    const session = await supabase.auth.getSession()
    const accessToken = session.data.session?.access_token;

    setIsRunning(true)

    let response: Response | undefined;
    try {
      response = await fetch('https://zrshjxlfodmuulctapbw.supabase.co/functions/v1/boulder-bot', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5000 milliseconds timeout
      })

      if (!response.ok) {
        const resp = await response?.json();
        const error = resp?.error || 'Unknown error';
        setNotification({
          type: 'error',
          message: `Failed to start Boulderbot: ${error}`
        })
      } else {
        console.log('unexpected success response from boulderbot start', response);
      }
    } catch (error) {
      // we do expect a timeout error here
      if (error instanceof Error && error.name === 'TimeoutError') {
        setNotification({
          type: 'success',
          message: 'Boulderbot started successfully! (Check logs for progress.)'
        })
        return;
      } else {
        console.error('Publish error:', error)
        setNotification({
          type: 'error',
          message: `Publish failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    } finally {
      setIsRunning(false)
      onComplete && readLastBoulderBotAction( onComplete);
    }
  }

  return (
    <>
      <Button disabled={isRunning} onClick={handleRunBoulderBot}>
        {isRunning ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
         <SquarePlay size={16} />
        )}
        <span className='pl-4'></span>{isRunning ? 'Running...' : 'Run Boulderbot'}
      </Button>
      {/* Notification */}
      {notification && (
        <Notification
          color={notification.type === 'success' ? 'green' : 'red'}
          onClose={() => setNotification(null)}
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            minWidth: 300
          }}
        >
          {notification.message}
        </Notification>
      )}
    </>
  )
}