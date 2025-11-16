import { useState } from 'react';
import {
  Button,
  Group,
  Stack,
  Image,
  Text,
  Notification,
  Radio,
  Anchor,
  Table
} from '@mantine/core';

import { useDisclosure } from '@mantine/hooks';
import type { Event, Venue, Organizer, Tag, WasmEvent, WasmEventAction } from '@/types';
import { supabase } from '@/data/supabase';
import { ExternalLink } from 'lucide-react';

interface WasmEventEditFormProps {
  wasmEvent?: WasmEvent | null;
  event?: Event | null;
  venues: Venue[];
  allTags: Tag[];
  currentTags: Tag[];
  organizers: Organizer[];
  onSave?: (event: WasmEvent, tags: Tag[]) => void;
  onCancel?: () => void;
  onDelete?: (eventId: number) => void;
}

export type FormAction = 'PUBLISH_AS_DRAFT' | 'PUBLISH_AS_PUBLISHED' | 'UPDATE_EVENT' | 'IGNORE_ONCE' | 'IGNORE_FOREVER' | 'CHANGE_IMPORT_TYPE';

export function WasmEventEditForm({ wasmEvent, event, venues, allTags, currentTags, organizers, onSave, onCancel, onDelete }: WasmEventEditFormProps) {
  const [loading, setLoading] = useState(false);

  let defaultAction: FormAction = 'IGNORE_FOREVER';
  switch (wasmEvent?.status) {
    case 'NEW':
      if (wasmEvent?.classification === 'COMPETITION') {
        defaultAction = 'PUBLISH_AS_PUBLISHED';
      }
      break;
    case 'CHANGED':
      defaultAction = 'UPDATE_EVENT';
      break;
    case 'UP_TO_DATE':
      defaultAction = 'CHANGE_IMPORT_TYPE';
      break;
  }

  const [formAction, setFormAction] = useState<FormAction>(defaultAction);
  const [wasmEventAction, setWasmEventAction] = useState<WasmEventAction>(wasmEvent?.action || 'MANUAL_IMPORT');


  // UI state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Validation - not much to validate here yet
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
      //  title: title.trim(),
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
        message: `Event ${wasmEvent?.id ? 'updated' : 'created'} successfully!`
      });

      // if (onSave && result.data) {
      //   onSave(result.data, allTags.filter(tag => selectedTagIds.includes(tag.id.toString())));
      // }

    } catch (error: any) {
      console.error('Error saving event:', error);
      setNotification({
        type: 'error',
        message: `Failed to ${wasmEvent?.id ? 'update' : 'create'} event: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Stack spacing="md">
          <Text size="lg" weight={500}>
            Bolder Bot Event: {wasmEvent?.name}
          </Text>
          <Group position="apart" align="flex-start">
            <Stack spacing="xs">
              <Group spacing={4} align="center">
                <Text size="sm" color="dimmed" style={{ minWidth: '100px' }}>
                  External ID:
                </Text>
                <Text size="sm" weight={500}>
                  {wasmEvent?.external_id}
                </Text>
                <Anchor
                  href={wasmEvent?.event_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                >
                  <ExternalLink size={14} />
                </Anchor>
              </Group>

              <Group spacing={4} align="center">
                <Text size="sm" color="dimmed" style={{ minWidth: '100px' }}>
                  Event ID:
                </Text>
                <Text size="sm" weight={500}>
                  {wasmEvent?.event_id ? wasmEvent.event_id : '-'}
                </Text>
                {wasmEvent?.event_id && (
                  <Anchor
                    href={`/events/${wasmEvent.event_id}`}
                    size="sm"
                  >
                    <ExternalLink size={14} />
                  </Anchor>
                )}
              </Group>

              <Group spacing={4} align="center">
                <Text size="sm" color="dimmed" style={{ minWidth: '100px' }}>
                  Status:
                </Text>
                <Text size="sm" weight={500} >
                  {wasmEvent?.status || '-'}
                </Text>
              </Group>
              <Group spacing={4} align="center">
                <Text size="sm" color="dimmed" style={{ minWidth: '100px' }}>
                  Processed at:
                </Text>
                <Text size="sm">
                  {wasmEvent?.processed_at ? new Date(wasmEvent.processed_at).toLocaleString() : 'N/A'}
                </Text>
              </Group>
            </Stack>

            <Stack spacing="xs" style={{ minWidth: '500px' }}>
              <Text size="sm" weight={800}>Action</Text>
              <Radio.Group
                value={formAction}
                // hacky cast
                onChange={(e) => setFormAction(e as FormAction)}
              >
                <Stack spacing="xs">
                  <Radio value="PUBLISH_AS_DRAFT" label="Copy event as draft" />
                  <Radio value="PUBLISH_AS_PUBLISHED" label="Copy event as published" />
                  <Radio value="IGNORE_ONCE" label="Ignore this event once" />
                  <Radio value="IGNORE_FOREVER" label="Ignore this event forever" />
                </Stack>
              </Radio.Group>
              <Text size="sm" weight={800}>Select import type</Text>
              <Radio.Group
                value={wasmEventAction}
                onChange={(e) => setWasmEventAction(e as WasmEventAction)}
              >
                <Stack spacing="xs">
                  <Radio value="MANUAL_IMPORT" label="Manual Import" />
                  <Radio value="AUTO_IMPORT" label="Auto Import" />
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
                <th style={{ width: '40%' }}>Event Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Name</strong></td>
                <td>{wasmEvent?.name || '-'}</td>
                <td>{event?.title || '-'}</td>
              </tr>
              <tr>
                <td><strong>Hall Name</strong></td>
                <td>{wasmEvent?.hall_name || '-'}</td>
                {/* todo: map to venue name */}
                <td>{event?.venue_id || '-'}</td>
              </tr>
              <tr>
                <td><strong>Date</strong></td>
                <td>{wasmEvent?.date ? new Date(wasmEvent.date).toLocaleDateString() : '-'}</td>
                <td>{event?.start_date_time ? new Date(event.start_date_time).toLocaleString() : '-'}</td>
              </tr>
              <tr>
                <td><strong>Image URL</strong></td>
                <td>
                  {wasmEvent?.image_url ? (
                    <Anchor href={wasmEvent.image_url} target="_blank" rel="noopener noreferrer" size="sm">
                      <Group spacing={4}>
                        <Group spacing={4} align="center">
                          <Image
                            src={wasmEvent.image_url}
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
                  {event?.featured_image_ref ? (
                    // fix: request image from supabase storage
                    <Anchor href={event.featured_image_ref} target="_blank" rel="noopener noreferrer" size="sm">
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
                <td style={{ maxWidth: '300px', wordWrap: 'break-word' }}>{wasmEvent?.short_description || '-'}</td>
                <td style={{ maxWidth: '300px', wordWrap: 'break-word' }}>{event?.featured_text || '-'}</td>
              </tr>
              <tr>
                <td><strong>Event URL</strong></td>
                <td>
                  {wasmEvent?.event_url ? (
                    <Anchor href={wasmEvent.event_url} target="_blank" rel="noopener noreferrer" size="sm">
                      <Group spacing={4}>
                        <span>{wasmEvent?.event_url}</span>
                        <ExternalLink size={12} />
                      </Group>
                    </Anchor>
                  ) : '-'}
                </td>
                <td>
                  {event?.link ? (
                    <Anchor href={event.link} target="_blank" rel="noopener noreferrer" size="sm">
                      <Group spacing={4}>
                        <span>{event?.link}</span>
                        <ExternalLink size={12} />
                      </Group>
                    </Anchor>
                  ) : '-'}
                </td>
              </tr>
              <tr>
                <td><strong>Event Category</strong></td>
                <td>{wasmEvent?.event_category || '-'}</td>
                <td>{currentTags.map((t) => <>{t.name}</>)}</td>
              </tr>
              <tr>
                <td><strong>Classification</strong></td>
                <td>{wasmEvent?.classification || '-'}</td>
                <td>{'-'}</td>
              </tr>
            </tbody>
          </Table>
        </Stack>
      </form>

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