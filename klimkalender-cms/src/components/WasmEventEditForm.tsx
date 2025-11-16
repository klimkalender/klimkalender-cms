import { useState } from 'react';
import {
  Button,
  TextInput,
  Textarea,
  Select,
  Switch,
  Group,
  Stack,
  Image,
  Text,
  Modal,
  Notification,
  Radio,
  MultiSelect
} from '@mantine/core';

import { useDisclosure } from '@mantine/hooks';
import type { Event, Venue, Organizer, Tag, WasmEvent } from '@/types';
import { supabase } from '@/data/supabase';
import { DateTime } from 'luxon';
import { BookCheck } from 'lucide-react';

interface WasmEventEditFormProps {
  wasmEvent?: WasmEvent | null;
  venues: Venue[];
  allTags: Tag[];
  currentTags: Tag[];
  organizers: Organizer[];
  onSave?: (event: WasmEvent, tags: Tag[]) => void;
  onCancel?: () => void;
  onDelete?: (eventId: number) => void;
}

function formatDateInputTime(tzDate: Date) {
  if (!tzDate) return undefined;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${tzDate.getFullYear()}-${pad(tzDate.getMonth() + 1)}-${pad(tzDate.getDate())}T${pad(tzDate.getHours())}:${pad(tzDate.getMinutes())}`;
}

export function WasmEventEditForm({ wasmEvent: event, venues, allTags, currentTags, organizers, onSave, onCancel, onDelete }: WasmEventEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(event?.name || '');

  const [startDateTime, setStartDateTime] = useState(() => {
    if (event?.date) {
      // hardcoded default timezone for wasm events
      const tz =  'Europe/Amsterdam';
      return DateTime.fromISO(event.date).setZone(tz).toJSDate();
    }
    return null;
  });
  const [status, setStatus] = useState(event?.status || 'DRAFT');
  const [link, setLink] = useState(event?.event_url || '');
  
  // Tags handling
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    currentTags.map(tag => tag.id.toString())
  );

  // Image handling
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // UI state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Validation
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

     setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  // Handle form submission
  const handleSubmit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {


      const eventData = {
        title: title.trim(),
        // toher fields here
      };

      let result;

      // if (event?.id) {
      //   // Update existing event
      //   result = await supabase
      //     .from('events')
      //     .update(eventData)
      //     .eq('id', event.id)
      //     .select()
      //     .single();
      // } else {
      //   // Create new event
      //   result = await supabase
      //     .from('events')
      //     .insert(eventData)
      //     .select()
      //     .single();
      // }

      // if (result.error) {
      //   throw result.error;
      // }

      // Manage event tags
      // if (result.data?.id) {
      //   await manageEventTags(result.data.id, selectedTagIds);
      // }

      setNotification({
        type: 'success',
        message: `Event ${event?.id ? 'updated' : 'created'} successfully!`
      });

      // if (onSave && result.data) {
      //   onSave(result.data, allTags.filter(tag => selectedTagIds.includes(tag.id.toString())));
      // }

    } catch (error: any) {
      console.error('Error saving event:', error);
      setNotification({
        type: 'error',
        message: `Failed to ${event?.id ? 'update' : 'create'} event: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };


  // Handle event deletion confirmation
  const handleDeleteClick = () => {
    openDeleteModal();
  };

  // Execute event deletion
  const confirmDelete = async () => {
    if (!event?.id || !onDelete) return;

    closeDeleteModal();
    setLoading(true);

    try {
      // Delete the event image from storage if it exists
    

      onDelete(event.id);

    } catch (error: any) {
      console.error('Error deleting event:', error);
      setNotification({
        type: 'error',
        message: `Failed to delete event: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Convert venues and organizers to select data
  const venueSelectData = venues.map(venue => ({
    value: venue.id.toString(),
    label: venue.name
  }));

  const organizerSelectData = organizers.map(organizer => ({
    value: organizer.id.toString(),
    label: organizer.name
  }));

  const tagsSelectData = allTags.map(tag => ({
    value: tag.id.toString(),
    label: tag.name
  }));

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Stack spacing="md">
          <Group position="apart" align="center">
            <Text size="lg" weight={500}>
              Bolder Bot Event: {event?.name}
            </Text>

            {/* Publish Button - show for existing events in draft status OR new events */}
            {((event?.id && status === 'DRAFT') || !event?.id) && (
              <Button
                color="green"
                // onClick={event?.id ? handlePublish : handlePublishNew}
                loading={loading}
                leftIcon={<BookCheck />}
              >
                Publish Event
              </Button>
            )}
          </Group>

          <TextInput
            label="Title"
            placeholder="Enter event title"
            required
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            error={errors.title}
          />

          <Group position="apart" mt="md">
            <div>
              {event?.id && onDelete && (
                <Button
                  variant="outline"
                  color="red"
                  onClick={handleDeleteClick}
                  disabled={loading}
                >
                  Delete Event
                </Button>
              )}
            </div>

            <Group position="right">
              {onCancel && (
                <Button variant="light" onClick={onCancel} disabled={loading}>
                  Cancel
                </Button>
              )}
              <Button type="submit" loading={loading}>
                {event?.id ? 'Update Event' : 'Save as Draft'}
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Confirm Deletion"
        size="sm"
      >
        <Stack spacing="md">
          <Text>
            Are you sure you want to delete "<strong>{event?.name}</strong>"?
          </Text>
          <Text size="sm" color="dimmed">
            This action cannot be undone.
          </Text>

          <Group position="right" spacing="sm">
            <Button variant="light" onClick={closeDeleteModal}>
              Cancel
            </Button>
            <Button color="red" onClick={confirmDelete}>
              Delete Event
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Notification */}
      {notification && (
        <Notification
          color={notification.type === 'success' ? 'green' : 'red'}
          onClose={() => setNotification(null)}
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 1000,
            minWidth: 300
          }}
        >
          {notification.message}
        </Notification>
      )}
    </>
  );
}