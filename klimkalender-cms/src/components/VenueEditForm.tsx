import { useState } from 'react';
import {
  Button,
  TextInput,
  Textarea,
  NumberInput,
  Group,
  Stack,
  Image,
  Text,
  Modal,
  Notification
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { Venue } from '@/types';
import { supabase } from '@/data/supabase';

interface VenueEditFormProps {
  venue?: Venue | null;
  onSave?: (venue: Venue) => void;
  onCancel?: () => void;
  onDelete?: (venueId: number) => void;
}

export function VenueEditForm({ venue, onSave, onCancel, onDelete }: VenueEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(venue?.name || '');
  const [address, setAddress] = useState(venue?.address || '');
  const [city, setCity] = useState(venue?.city || '');
  const [country, setCountry] = useState(venue?.country || '');
  const [postalCode, setPostalCode] = useState(venue?.postal_code || '');
  const [lat, setLat] = useState<number | undefined>(venue?.lat || undefined);
  const [long, setLong] = useState<number | undefined>(venue?.long || undefined);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Validation
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (lat !== undefined && (lat < -90 || lat > 90)) {
      newErrors.lat = 'Latitude must be between -90 and 90';
    }
    
    if (long !== undefined && (long < -180 || long > 180)) {
      newErrors.long = 'Longitude must be between -180 and 180';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Get current image URL if venue has an image
  const getCurrentImageUrl = () => {
    if (!venue?.image_ref) return null;
    const { data } = supabase.storage.from('venue-images').getPublicUrl(venue.image_ref);
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
    const fileBaseName = file.name.split('/').pop();
    const fileName = `${Math.random().toString(36).substring(2,6)}.${fileBaseName}`;
    
    const { data, error } = await supabase.storage
      .from('venue-images')
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
      .from('venue-images')
      .remove([imagePath]);
    
    if (error) {
      console.error('Error deleting old image:', error);
    }
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      let imageRef = venue?.image_ref || null;
      
      // Handle image upload if a new image was selected
      if (imageFile) {
        // Upload new image
        const newImageRef = await uploadImage(imageFile);
        if (newImageRef) {
          imageRef = newImageRef;
          
          // Delete old image if updating an existing venue
          if (venue?.image_ref && venue.image_ref !== newImageRef) {
            await deleteOldImage(venue.image_ref);
          }
        }
      }

      const venueData = {
        name: name.trim(),
        address: address.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        postal_code: postalCode.trim() || null,
        lat: lat || null,
        long: long || null,
        image_ref: imageRef,
      };

      let result;
      
      if (venue?.id) {
        // Update existing venue
        result = await supabase
          .from('venues')
          .update(venueData)
          .eq('id', venue.id)
          .select()
          .single();
      } else {
        // Create new venue
        result = await supabase
          .from('venues')
          .insert(venueData)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      setNotification({
        type: 'success',
        message: `Venue ${venue?.id ? 'updated' : 'created'} successfully!`
      });

      if (onSave && result.data) {
        onSave(result.data);
      }

    } catch (error: any) {
      console.error('Error saving venue:', error);
      setNotification({
        type: 'error',
        message: `Failed to ${venue?.id ? 'update' : 'create'} venue: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle venue deletion confirmation
  const handleDeleteClick = () => {
    openDeleteModal();
  };

  // Execute venue deletion
  const confirmDelete = async () => {
    if (!venue?.id || !onDelete) return;
    
    closeDeleteModal();
    setLoading(true);
    
    try {
      // Delete the venue image from storage if it exists
      if (venue.image_ref) {
        await deleteOldImage(venue.image_ref);
      }

      // Delete the venue from the database
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venue.id);

      if (error) {
        throw error;
      }

      setNotification({
        type: 'success',
        message: 'Venue deleted successfully!'
      });
      
      onDelete(venue.id);

    } catch (error: any) {
      console.error('Error deleting venue:', error);
      setNotification({
        type: 'error',
        message: `Failed to delete venue: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const currentImageUrl = getCurrentImageUrl();

  return (
    <>
    <form onSubmit={handleSubmit}>
      <Stack spacing="md">
        <Text size="lg" weight={500}>
          {venue?.id ? 'Edit Venue' : 'Create New Venue'}
        </Text>

        <TextInput
          label="Name"
          placeholder="Enter venue name"
          required
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          error={errors.name}
        />

        <TextInput
          label="Address"
          placeholder="Enter street address"
          value={address}
          onChange={(event) => setAddress(event.currentTarget.value)}
        />

        <Group grow>
          <TextInput
            label="City"
            placeholder="Enter city"
            value={city}
            onChange={(event) => setCity(event.currentTarget.value)}
          />
          <TextInput
            label="Postal Code"
            placeholder="Enter postal code"
            value={postalCode}
            onChange={(event) => setPostalCode(event.currentTarget.value)}
          />
        </Group>

        <Group grow>
          <TextInput
            label="Country"
            placeholder="Enter country"
            value={country}
            onChange={(event) => setCountry(event.currentTarget.value)}
          />
        </Group>

        <Group grow>
          <NumberInput
            label="Latitude"
            placeholder="e.g., 47.6062"
            precision={6}
            value={lat}
            onChange={(value) => setLat(typeof value === 'number' ? value : undefined)}
            error={errors.lat}
          />
          <NumberInput
            label="Longitude"
            placeholder="e.g., -122.3321"
            precision={6}
            value={long}
            onChange={(value) => setLong(typeof value === 'number' ? value : undefined)}
            error={errors.long}
          />
        </Group>

        <div>
          <Text size="sm" weight={500} mb="xs">
            Venue Image
          </Text>
          
          {/* Current image display */}
          {currentImageUrl && !imagePreview && (
            <div style={{ marginBottom: 12 }}>
              <Text size="xs" color="dimmed" mb="xs">Current image:</Text>
              <Image
                src={currentImageUrl}
                alt="Current venue image"
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
                alt="New venue image preview"
                width={200}
                height={150}
                fit="cover"
                radius="md"
              />
            </div>
          )}

          <div>
            <label htmlFor="venue-image">Select image file:</label>
            <input
              id="venue-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ marginLeft: '10px' }}
            />
          </div>
        </div>

        <Group position="apart" mt="md">
          <div>
            {venue?.id && onDelete && (
              <Button 
                variant="outline" 
                color="red" 
                onClick={handleDeleteClick} 
                disabled={loading}
              >
                Delete Venue
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
              {venue?.id ? 'Update Venue' : 'Create Venue'}
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
          Are you sure you want to delete "<strong>{venue?.name}</strong>"?
        </Text>
        <Text size="sm" color="dimmed">
          This action cannot be undone.
        </Text>
        
        <Group position="right" spacing="sm">
          <Button variant="light" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmDelete}>
            Delete Venue
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