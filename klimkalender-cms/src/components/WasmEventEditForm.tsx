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
  MultiSelect,
  Anchor,
  Table
} from '@mantine/core';

import { useDisclosure } from '@mantine/hooks';
import type { Event, Venue, Organizer, Tag, WasmEvent } from '@/types';
import { supabase } from '@/data/supabase';
import { DateTime } from 'luxon';
import { BookCheck, ExternalLink } from 'lucide-react';

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
      const tz = 'Europe/Amsterdam';
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
          <Text size="lg" weight={500}>
            Bolder Bot Event: {event?.name}
          </Text>
          <Group position="apart" align="flex-start">
            <Stack spacing="xs">

              <Group spacing={4} align="center">
                <Text size="sm" color="dimmed" style={{ minWidth: '80px' }}>
                  External ID:
                </Text>
                <Text size="sm" weight={500}>
                  {event?.external_id}
                </Text>
                <Anchor
                  href={event?.event_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                >
                  <ExternalLink size={14} />
                </Anchor>
              </Group>

              <Group spacing={4} align="center">
                <Text size="sm" color="dimmed" style={{ minWidth: '80px' }}>
                  Event ID:
                </Text>
                <Text size="sm" weight={500}>
                  {event?.event_id ? event.event_id : '-'}
                </Text>
                {event?.event_id && (
                  <Anchor
                    href={`/events/${event.event_id}`}
                    size="sm"
                  >
                    <ExternalLink size={14} />
                  </Anchor>
                )}
              </Group>

              <Group spacing={4} align="center">
                <Text size="sm" color="dimmed" style={{ minWidth: '80px' }}>
                  Status:
                </Text>
                <Text size="sm" weight={500} color={status === 'PUBLISHED' ? 'green' : status === 'DRAFT' ? 'orange' : 'gray'}>
                  {status}
                </Text>
              </Group>
              <Group spacing={4} align="center">
                <Text size="sm" color="dimmed" style={{ minWidth: '80px' }}>
                  Processed at:
                </Text>
                <Text size="sm">
                  {event?.processed_at ? new Date(event.processed_at).toLocaleString() : 'N/A'}
                </Text>
              </Group>
            </Stack>

            <Stack spacing="xs" style={{ minWidth: '500px' }}>
              <Text size="sm" weight={500}>Action</Text>
              <Radio.Group
                value={status}
                onChange={setStatus}
              >
                <Stack spacing="xs">
                  <Radio value="PUBLISH_AS_DRAFT" label="Copy event as draft" />
                  <Radio value="PUBLISH_AS_PUBLISHED" label="Copy event as published" />
                  <Radio value="IGNORE" label="Ignore this event forever" />
                </Stack>
              </Radio.Group>
                            <Text size="sm" weight={500}>Select import type</Text>
              <Radio.Group
                value={status}
                onChange={setStatus}
              >
                <Stack spacing="xs">
                  <Radio value="MANUAL" label="Manual Import" />
                  <Radio value="AUTO" label="Auto Import" />
                </Stack>
              </Radio.Group>
            </Stack>
            
          </Group>
          <Group position="right" >
            {onCancel && (
              <Button variant="light" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
            )}
            <Button type="submit" loading={loading}>
              Apply Changes
            </Button>
          </Group>

          {/* Comparison Table */}
          <Table withColumnBorders={false} withBorder={false} mt="md">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Field</th>
                <th style={{ width: '40%' }}>Current Value</th>
                <th style={{ width: '40%' }}>Accepted Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Name</strong></td>
                <td>{event?.name || '-'}</td>
                <td>{event?.accepted_name || '-'}</td>
              </tr>
              <tr>
                <td><strong>Hall Name</strong></td>
                <td>{event?.hall_name || '-'}</td>
                <td>{event?.accepted_hall_name || '-'}</td>
              </tr>
              <tr>
                <td><strong>Date</strong></td>
                <td>{event?.date ? new Date(event.date).toLocaleString() : '-'}</td>
                <td>{event?.accepted_date ? new Date(event.accepted_date).toLocaleString() : '-'}</td>
              </tr>
              <tr>
                <td><strong>Image URL</strong></td>
                <td>
                  {event?.image_url ? (
                    <Anchor href={event.image_url} target="_blank" rel="noopener noreferrer" size="sm">
                      <Group spacing={4}>
                        <Group spacing={4} align="center">
                          <Image
                            src={event.image_url}
                            alt="Event image preview"
                            width={40}
                            height={40}
                            fit="cover"
                            radius="xs"
                          />
                          <span>View Image</span>
                        </Group>
                        <ExternalLink size={12} />
                      </Group>
                    </Anchor>
                  ) : '-'}
                </td>
                <td>
                  {event?.accepted_image_url ? (
                    <Anchor href={event.accepted_image_url} target="_blank" rel="noopener noreferrer" size="sm">
                      <Group spacing={4}>
                        <span>View Image</span>
                        <ExternalLink size={12} />
                      </Group>
                    </Anchor>
                  ) : '-'}
                </td>
              </tr>
              <tr>
                <td><strong>Short Description</strong></td>
                <td style={{ maxWidth: '300px', wordWrap: 'break-word' }}>{event?.short_description || '-'}</td>
                <td style={{ maxWidth: '300px', wordWrap: 'break-word' }}>{event?.accepted_short_description || '-'}</td>
              </tr>
              <tr>
                <td><strong>Event URL</strong></td>
                <td>
                  {event?.event_url ? (
                    <Anchor href={event.event_url} target="_blank" rel="noopener noreferrer" size="sm">
                      <Group spacing={4}>
                        <span>{event?.event_url}</span>
                        <ExternalLink size={12} />
                      </Group>
                    </Anchor>
                  ) : '-'}
                </td>
                <td>
                  {event?.accepted_event_url ? (
                    <Anchor href={event.accepted_event_url} target="_blank" rel="noopener noreferrer" size="sm">
                      <Group spacing={4}>
                        <span>{event?.accepted_event_url}</span>
                        <ExternalLink size={12} />
                      </Group>
                    </Anchor>
                  ) : '-'}
                </td>
              </tr>
              <tr>
                <td><strong>Classification</strong></td>
                <td>{event?.classification || '-'}</td>
                <td>{event?.accepted_classification || '-'}</td>
              </tr>
              <tr>
                <td><strong>Event Category</strong></td>
                <td>{event?.event_category || '-'}</td>
                <td>{event?.accepted_event_category || '-'}</td>
              </tr>
            </tbody>
          </Table>

          <Group position="apart" mt="md">
            <div>
              {/* {event?.id && onDelete && (
                <Button
                  variant="outline"
                  color="red"
                  onClick={handleDeleteClick}
                  disabled={loading}
                >
                  Delete Event
                </Button>
              )} */}
            </div>


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