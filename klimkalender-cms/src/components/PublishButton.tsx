import { useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { Notification } from '@mantine/core'
import { supabase } from '@/data/supabase'

export default function PublishButton() {
  const [isPublishing, setIsPublishing] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const handlePublish = async () => {
    const session = await supabase.auth.getSession()
    const accessToken = session.data.session?.access_token;

    setIsPublishing(true)

    try {
      const response = await fetch('https://zrshjxlfodmuulctapbw.supabase.co/functions/v1/kk-publisher', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setNotification({
          type: 'success',
          message: 'Published successfully!'
        })
      } else {
        const errorText = await response.text()
        setNotification({
          type: 'error',
          message: `Publish failed: ${errorText}`
        })
      }
    } catch (error) {
      console.error('Publish error:', error)
      setNotification({
        type: 'error',
        message: `Publish failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handlePublish}
        disabled={isPublishing}
        className="flex items-center gap-2 px-3 py-2 text-black hover:text-white border border-black hover:bg-black focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-green-500 dark:text-green-500 dark:hover:text-white dark:hover:bg-green-600 dark:focus:ring-green-800"
      >
        {isPublishing ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Upload size={16} />
        )}
        {isPublishing ? 'Publishing...' : 'Publish'}
      </button>

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