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
import type { Event, Venue, Organizer, Tag } from '@/types';
import { supabase } from '@/data/supabase';
import { DateTime } from 'luxon';
import { BookCheck } from 'lucide-react';

interface EventEditFormProps {
  event?: Event | null;
  venues: Venue[];
  allTags: Tag[];
  currentTags: Tag[];
  organizers: Organizer[];
  onSave?: (event: Event, tags: Tag[]) => void;
  onCancel?: () => void;
  onDelete?: (eventId: number) => void;
}

function formatDateInputTime(tzDate: Date) {
  if (!tzDate) return undefined;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${tzDate.getFullYear()}-${pad(tzDate.getMonth() + 1)}-${pad(tzDate.getDate())}T${pad(tzDate.getHours())}:${pad(tzDate.getMinutes())}`;
}

export function EventEditForm({ event, venues, allTags, currentTags, organizers, onSave, onCancel, onDelete }: EventEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(event?.title || '');

  const [startDateTime, setStartDateTime] = useState(() => {
    if (event?.start_date_time) {
      const tz = event.time_zone || 'Europe/Amsterdam';
      return DateTime.fromISO(event.start_date_time).setZone(tz).toJSDate();
    }
    return null;
  });
  const [endDateTime, setEndDateTime] = useState(() => {
    if (event?.end_date_time) {
      const tz = event.time_zone || 'Europe/Amsterdam';
      return DateTime.fromISO(event.end_date_time).setZone(tz).toJSDate();
    }
    return null;
  });
  const [timeZone, setTimeZone] = useState(event?.time_zone || 'Europe/Amsterdam');
  const [isFullDay, setIsFullDay] = useState(event?.is_full_day ?? true);
  const [venueId, setVenueId] = useState<string | null>(
    event?.venue_id ? event.venue_id.toString() : null
  );
  const [organizerId, setOrganizerId] = useState<string | null>(
    event?.organizer_id ? event.organizer_id.toString() : null
  );
  const [status, setStatus] = useState(event?.status || 'DRAFT');
  const [featured, setFeatured] = useState(event?.featured || false);
  const [featuredText, setFeaturedText] = useState(event?.featured_text || '');
  const [link, setLink] = useState(event?.link || '');
  const [remarks, setRemarks] = useState(event?.remarks || '');
  
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

    if (venueId === '') {
      newErrors.venueId = 'Venue is required';
    }

    if (featured && !imageFile && !event?.featured_image_ref) {
      newErrors.featuredImage = 'Featured image is required for featured events';
    }

    if (featured && !featuredText) {
      newErrors.featuredText = 'Featured text is required for featured events';
    }

    if (title.trim().length < 2) {
      newErrors.title = 'Title must be at least 2 characters';
    }

    if (endDateTime && startDateTime && endDateTime <= startDateTime) {
      newErrors.endDateTime = 'End date must be after start date';
    }

    if(!endDateTime) {
      newErrors.endDateTime = 'End date is required';
    }

    console.log(startDateTime);
    if(!startDateTime) {
      newErrors.startDateTime = 'Start date is required';
    }

    if (!link.trim()) {
      newErrors.link = 'Event link is required';
    } else {
      // Validate URL format
      try {
        const url = new URL(link.trim());
        // Check if it's http or https protocol
        if (!['http:', 'https:'].includes(url.protocol)) {
          newErrors.link = 'Link must be a valid HTTP or HTTPS URL';
        }
      } catch (error) {
        newErrors.link = 'Please enter a valid URL (e.g., https://example.com)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Get current image URL if event has a featured image
  const getCurrentImageUrl = () => {
    if (!event?.featured_image_ref) return null;
    const { data } = supabase.storage.from('event-images').getPublicUrl(event.featured_image_ref);
    return data?.publicUrl;
  };

  // Handle file selection and preview
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  // Upload image to Supabase storage
  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('event-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading image:', error);
      throw error;
    }

    return data?.path || null;
  };

  // Delete old image from storage
  const deleteOldImage = async (imagePath: string) => {
    const { error } = await supabase.storage
      .from('event-images')
      .remove([imagePath]);

    if (error) {
      console.error('Error deleting old image:', error);
    }
  };

  // Helper function to manage event tags
  const manageEventTags = async (eventId: number, newTagIds: string[]) => {
    try {
      // First, delete existing tags for this event
      const deleteResult = await supabase
        .from('event_tags')
        .delete()
        .eq('event_id', eventId);

      if (deleteResult.error) {
        throw deleteResult.error;
      }

      // Then insert new tag relationships if any tags are selected
      if (newTagIds.length > 0) {
        const tagInserts = newTagIds.map(tagId => ({
          event_id: eventId,
          tag_id: parseInt(tagId)
        }));

        const insertResult = await supabase
          .from('event_tags')
          .insert(tagInserts);

        if (insertResult.error) {
          throw insertResult.error;
        }
      }
    } catch (error) {
      console.error('Error managing event tags:', error);
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let featuredImageRef = event?.featured_image_ref || null;

      // Handle image upload if a new image was selected
      if (imageFile) {
        // Upload new image
        const newImageRef = await uploadImage(imageFile);
        if (newImageRef) {
          featuredImageRef = newImageRef;

          // Delete old image if updating an existing event
          if (event?.featured_image_ref && event.featured_image_ref !== newImageRef) {
            await deleteOldImage(event.featured_image_ref);
          }
        }
      }


      let resStartDateTime = startDateTime;
      let resEndDateTime = endDateTime;
      if (isFullDay) {
        startDateTime?.setHours(0, 0, 0, 0);
        endDateTime?.setHours(23, 59, 59, 999);
      }

      const eventData = {
        title: title.trim(),
        start_date_time: resStartDateTime?.toISOString(),
        end_date_time: resEndDateTime?.toISOString(),
        time_zone: timeZone,
        is_full_day: isFullDay,
        venue_id: venueId ? parseInt(venueId) : null,
        organizer_id: organizerId ? parseInt(organizerId) : null,
        status: status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
        featured: featured,
        featured_text: featuredText.trim() || null,
        featured_image_ref: featuredImageRef,
        link: link.trim(),
        remarks: remarks.trim() || null,
      };

      let result;

      if (event?.id) {
        // Update existing event
        result = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id)
          .select()
          .single();
      } else {
        // Create new event
        result = await supabase
          .from('events')
          .insert(eventData)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      // Manage event tags
      if (result.data?.id) {
        await manageEventTags(result.data.id, selectedTagIds);
      }

      setNotification({
        type: 'success',
        message: `Event ${event?.id ? 'updated' : 'created'} successfully!`
      });

      if (onSave && result.data) {
        onSave(result.data, allTags.filter(tag => selectedTagIds.includes(tag.id.toString())));
      }

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

  // Handle publish action
  const handlePublish = async () => {
    if (!event?.id) return;
    
    setLoading(true);
    
    try {
      // Update event status to PUBLISHED
      const result = await supabase
        .from('events')
        .update({ status: 'PUBLISHED' })
        .eq('id', event.id)
        .select()
        .single();

      if (result.error) {
        throw result.error;
      }

      // Update local state
      setStatus('PUBLISHED');

      setNotification({
        type: 'success',
        message: 'Event published successfully!'
      });

      if (onSave && result.data) {
        onSave(result.data, allTags.filter(tag => selectedTagIds.includes(tag.id.toString())));
      }

    } catch (error: any) {
      console.error('Error publishing event:', error);
      setNotification({
        type: 'error',
        message: `Failed to publish event: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle publish action for new events
  const handlePublishNew = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      let featuredImageRef = null;
      
      // Handle image upload if a new image was selected
      if (imageFile) {
        const newImageRef = await uploadImage(imageFile);
        if (newImageRef) {
          featuredImageRef = newImageRef;
        }
      }

      const eventData = {
        title: title.trim(),
        start_date_time: startDateTime!.toISOString(),
        end_date_time: endDateTime!.toISOString(),
        time_zone: timeZone,
        is_full_day: isFullDay,
        venue_id: venueId ? parseInt(venueId) : null,
        organizer_id: organizerId ? parseInt(organizerId) : null,
        status: 'PUBLISHED' as const,
        featured: featured,
        featured_text: featuredText.trim() || null,
        featured_image_ref: featuredImageRef,
        link: link.trim(),
        remarks: remarks.trim() || null,
      };

      // Create and publish new event
      const result = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (result.error) {
        throw result.error;
      }

      // Manage event tags
      if (result.data?.id) {
        await manageEventTags(result.data.id, selectedTagIds);
      }

      setNotification({
        type: 'success',
        message: 'Event created and published successfully!'
      });

      if (onSave && result.data) {
        onSave(result.data, allTags.filter(tag => selectedTagIds.includes(tag.id.toString())));
      }

    } catch (error: any) {
      console.error('Error creating and publishing event:', error);
      setNotification({
        type: 'error',
        message: `Failed to create and publish event: ${error.message}`
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
      if (event.featured_image_ref) {
        await deleteOldImage(event.featured_image_ref);
      }

      // Delete the event from the database
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);

      if (error) {
        throw error;
      }

      setNotification({
        type: 'success',
        message: 'Event deleted successfully!'
      });

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

  const currentImageUrl = getCurrentImageUrl();

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
              {event?.id ? 'Edit Event' : 'Add Event'}
            </Text>
            
            {/* Publish Button - show for existing events in draft status OR new events */}
            {((event?.id && status === 'DRAFT') || !event?.id) && (
              <Button 
                color="green" 
                onClick={event?.id ? handlePublish : handlePublishNew} 
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

          <Group grow>
            <div>
              <Text size="sm" weight={500} mb={5}>Start Date & Time *</Text>
              <input
                type="datetime-local"
                value={formatDateInputTime(startDateTime!)}
                onChange={(e) => setStartDateTime(new Date(e.target.value))}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              {errors.startDateTime && (
                <Text size="xs" color="red" mt={5}>{errors.startDateTime}</Text>
              )}
            </div>
            <div>
              <Text size="sm" weight={500} mb={5}>End Date & Time *</Text>
              <input
                type="datetime-local"
                value={formatDateInputTime(endDateTime!)}
                onChange={(e) => setEndDateTime(new Date(e.target.value))}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              {errors.endDateTime && (
                <Text size="xs" color="red" mt={5}>{errors.endDateTime}</Text>
              )}
            </div>
          </Group>

          <Group grow>
            <TextInput
              label="Time Zone"
              placeholder="e.g., UTC, America/New_York"
              value={timeZone}
              onChange={(event) => setTimeZone(event.currentTarget.value)}
            />
            <div>
              <Text size="sm" weight={500} mb={5}>Options</Text>
              <Switch
                label="Full Day Event"
                checked={isFullDay}
                onChange={(event) => {
                  const isChecked = event.currentTarget.checked;
                  setIsFullDay(isChecked);
                  
                  // When full day is toggled on, set times to 00:00 and 23:59
                  if (isChecked && startDateTime && endDateTime) {
                    const newStartDate = new Date(startDateTime);
                    newStartDate.setHours(0, 0, 0, 0); // Set to 00:00:00
                    setStartDateTime(newStartDate);
                    
                    const newEndDate = new Date(endDateTime);
                    newEndDate.setHours(23, 59, 0, 0); // Set to 23:59:00
                    setEndDateTime(newEndDate);
                  }
                }}
              />
            </div>
          </Group>

          <Group grow>
            <Select
              label="Venue"
              placeholder="Select venue"
              required
              data={venueSelectData}
              value={venueId}
              onChange={setVenueId}
              clearable
              searchable
            />
            <Select
              label="Organizer"
              placeholder="Select organizer"
              data={organizerSelectData}
              value={organizerId}
              onChange={setOrganizerId}
              clearable
              searchable
            />
          </Group>

          <MultiSelect
            label="Tags"
            placeholder="Select tags for this event"
            data={tagsSelectData}
            value={selectedTagIds}
            onChange={setSelectedTagIds}
            searchable
            clearable
          />

          <Group grow>
            <div>
              <Text size="sm" weight={500} mb={5}>Status *</Text>
              <Radio.Group
                value={status}
                onChange={(value) => setStatus(value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED')}
                required
              >
                <Stack spacing="xs">
                  <Radio value="DRAFT" label="Draft" />
                  <Radio value="PUBLISHED" label="Published" />
                  {event?.id && <Radio value="ARCHIVED" label="Archived" />}
                </Stack>
              </Radio.Group>
            </div>
            <div>
              <Text size="sm" weight={500} mb={5}>Featured Event</Text>
              <Switch
                label="Mark as featured"
                checked={featured}
                onChange={(event) => setFeatured(event.currentTarget.checked)}
              />
            </div>
          </Group>

          {featured && (
            <>
              <Textarea
                label="Featured Text"
                placeholder="Enter featured text (shown for featured events)"
                value={featuredText}
                onChange={(event) => setFeaturedText(event.currentTarget.value)}
                minRows={2}
                error={errors.featuredText}
              />
              <div>
                <Text size="sm" weight={500} mb="xs">
                  Featured Image
                </Text>

                {/* Current image display */}
                {currentImageUrl && !imagePreview && (
                  <div style={{ marginBottom: 12 }}>
                    <Text size="xs" color="dimmed" mb="xs">Current image:</Text>
                    <Image
                      src={currentImageUrl}
                      alt="Current event image"
                      width={200}
                      height={150}
                      fit="cover"
                      radius="md"
                    />
                  </div>
                )}

                {/* Image preview */}
                {imagePreview && (
                  <div style={{ marginBottom: 12 }}>
                    <Text size="xs" color="dimmed" mb="xs">New image preview:</Text>
                    <Image
                      src={imagePreview}
                      alt="New event image preview"
                      width={200}
                      height={150}
                      fit="cover"
                      radius="md"

                    />
                  </div>
                )}

                <div>
                  <label htmlFor="event-image">Select image file:</label>
                  <input
                    id="event-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ marginLeft: '10px' }}
                  />
                </div>
                {errors.featuredImage && (
                  <Text size="xs" color="red" mt={5}>{errors.featuredImage}</Text>
                )}
              </div>
            </>

          )}

          <TextInput
            label="Link"
            placeholder="Enter event link"
            required
            value={link}
            onChange={(event) => setLink(event.currentTarget.value)}
            error={errors.link}
          />

          <Textarea
            label="Remarks (internal use only)"
            placeholder="Enter remarks (optional)"
            value={remarks}
            onChange={(event) => setRemarks(event.currentTarget.value)}
            minRows={2}
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
            Are you sure you want to delete "<strong>{event?.title}</strong>"?
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