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
  Table,
  Select
} from '@mantine/core';

import type { Event, Venue, Organizer, Tag, WasmEvent, WasmEventAction, WasmEventStatus } from '@/types';
import { createEvent, supabase, updateWasmEvent, } from '@/data/supabase';
import { ExternalLink } from 'lucide-react';
import { uploadEventImage } from '@/utils/upload-image';

interface WasmEventEditFormProps {
  wasmEvent?: WasmEvent | null;
  event?: Event | null;
  venues: Venue[];
  allTags: Tag[];
  currentTags: Tag[];
  organizers: Organizer[];
  onSave?: (wasmEvent: WasmEvent, tags: Tag[], event: Event | null) => void;
  onCancel?: () => void;
  onDelete?: (eventId: number) => void;
}

export type FormAction = 'PUBLISH_AS_DRAFT' | 'PUBLISH_AS_PUBLISHED' | 'UPDATE_EVENT' | 'IGNORE_ONCE' | 'IGNORE_FOREVER' | 'CHANGE_IMPORT_TYPE';

export function WasmEventEditForm({ wasmEvent, event, venues, currentTags, onCancel, onSave }: WasmEventEditFormProps) {
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

  // best guess of the venue id based on hall name
  const defaultVenueId = wasmEvent?.hall_name ? venues.find(venue => venue.name.toLocaleLowerCase().includes(wasmEvent?.hall_name?.toLocaleLowerCase() || ''))?.id.toString() || null : null;
  const [formAction, setFormAction] = useState<FormAction>(defaultAction);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(defaultVenueId);
  const [wasmEventAction, setWasmEventAction] = useState<WasmEventAction>(wasmEvent?.action || 'MANUAL_IMPORT');

  // UI state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Validation - not much to validate here yet
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (selectedVenueId === null) {
      newErrors['venue'] = 'Venue is required for importing the event.';
    }

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

      switch (formAction) {
        case 'PUBLISH_AS_DRAFT':
          //create a new event
          try {
            if (!wasmEvent) throw new Error('WasmEvent is undefined');
            const newEvent = await createEvent(wasmEvent!, selectedVenueId ? parseInt(selectedVenueId) : 0, 'DRAFT');
            console.dir(newEvent);
            const updatedWasmEvent = {
              ...wasmEvent,
              event_id: newEvent?.id || 0,
              status: 'UP_TO_DATE' as WasmEventStatus,
              action: wasmEventAction,
              accepted_classification: wasmEvent.classification,
              accepted_date: wasmEvent.date,
              accepted_hall_name: wasmEvent.hall_name,
              accepted_short_description: wasmEvent.short_description,
              accepted_full_description_html: wasmEvent.full_description_html,
              accepted_event_url: wasmEvent.event_url,
              accepted_image_url: wasmEvent.image_url,
              accepted_event_category: wasmEvent.event_category,
            };

            await updateWasmEvent(updatedWasmEvent);
            if (wasmEvent.image_url) {
              console.log(`Uploading image ${wasmEvent.image_url} to supabase storage...`);
              const imageRef = await uploadEventImage(wasmEvent.image_url);
              if (imageRef) {
                const { error } = await supabase.from('events').update({ featured_image_ref: imageRef }).eq('id', newEvent?.id);
                if (error) {
                  console.error('Error updating event with image reference:', error);
                }
                if (newEvent) {
                  newEvent.featured_image_ref = imageRef;
                }
              } else {
                console.error('Image upload failed, no image reference returned.');
              }
            }
            // todo: set tags
            const tags: string[] = [];
            const dbTags: Tag[] = [];
            if (wasmEvent.event_category) {
              tags.push(wasmEvent.event_category);
            }
            console.log('Assigning tags to event:', tags);
            for (const tag of tags) {
              // find tag  id
              console.log(`Finding tag id for tag: ${tag}`);
              const tagRecord = await supabase.from('tags').select('*').eq('name', tag).single();
              if (tagRecord.data) {
                console.log(`Tag ${tag} found with id ${tagRecord.data.id}`);
                dbTags.push(tagRecord.data);
                const { error } = await supabase.from('event_tags').insert({ event_id: newEvent?.id, tag_id: tagRecord.data.id });
                if (error) {
                  console.error('Error adding tag to event:', error);
                }
              }
              else {
                console.warn(`Tag ${tag} not found in database.`);
              }
            }
            // set organizer if NKBV image found
            if (wasmEvent.image_url?.toUpperCase().includes('NKBV')) {
              console.log('NKBV image detected, setting organizer to NKBV');
              // find NKBV organizer
              const orgRecord = await supabase.from('organizers').select('*').eq('name', 'NKBV').single();
              if (orgRecord.data) {
                console.log(`NKBV organizer found with id ${orgRecord.data.id}`);
                const { error: linkError } = await supabase.from('events').update({ organizer_id: orgRecord.data.id }).eq('id', newEvent?.id);
                if (linkError) {
                  console.error('Error linking NKBV organizer to event:', linkError);
                }
              } else {
                console.warn('NKBV organizer not found in database.');
              }
            }
            // update local state
            if (onSave && updatedWasmEvent) {
              onSave(updatedWasmEvent, dbTags, newEvent || null);
            }
            setNotification({
              type: 'success',
              message: 'Event published as draft successfully.'
            });

          } catch (error) {
            console.error('Error creating event:', error);
            setNotification({
              type: 'error',
              message: `Publish as draft failed: ${(error as Error).message}.`
            });
          }
          break;
        default:
          setNotification({
            type: 'error',
            message: `Action ${formAction} not implemented yet.`
          });
          break;
      }

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

  const venue = event ? venues.find(v => v.id === event.venue_id || 0) : null;

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
              {!wasmEvent?.event_id && (
                <>
                  <Text size="sm" weight={800}>Select Venue</Text>
                  <Select
                    error={errors.venue}
                    onChange={setSelectedVenueId}
                    placeholder="Choose a venue"
                    value={selectedVenueId}
                    data={venues.map(venue => ({
                      value: venue.id.toString(),
                      label: venue.name
                    }))}
                    searchable
                  />
                </>
              )}
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
                <td>{venue?.name || '-'}</td>
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
                        <Group spacing={4} align="center">
                          <Image
                            src={supabase.storage.from('event-images').getPublicUrl(event.featured_image_ref).data.publicUrl}
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
                <td>{'-'}</td>
              </tr>
              <tr>
                <td><strong>Classification</strong></td>
                <td>{wasmEvent?.classification || '-'}</td>
                <td>{'-'}</td>
              </tr>
              <tr>
                <td><strong>Tags</strong></td>
                <td>{'-'}</td>
                <td>{currentTags.map((t) => <>{t.name}</>)}</td>
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

