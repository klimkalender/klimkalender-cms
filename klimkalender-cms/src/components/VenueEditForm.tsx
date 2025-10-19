import { useState } from 'react';
import {
  Button,
  TextInput,
  NumberInput,
  Group,
  Stack,
  Image,
  Text
} from '@mantine/core';
import type { Venue } from '@/types';
import { supabase } from '@/data/supabase';

interface VenueEditFormProps {
  venue?: Venue | null;
  onSave?: (venue: Venue) => void;
  onCancel?: () => void;
}

export function VenueEditForm({ venue, onSave, onCancel }: VenueEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(venue?.name || '');
  const [lat, setLat] = useState<number | undefined>(venue?.lat || undefined);
  const [long, setLong] = useState<number | undefined>(venue?.long || undefined);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

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
    const fileName = `${Math.random().toString(36).substring(7)}.${fileBaseName}`;
    
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

      if (onSave && result.data) {
        onSave(result.data);
      }

    } catch (error: any) {
      console.error('Error saving venue:', error);
      alert(`Failed to ${venue?.id ? 'update' : 'create'} venue: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const currentImageUrl = getCurrentImageUrl();

  return (
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

        <Group position="right" mt="md">
          {onCancel && (
            <Button variant="light" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={loading}>
            {venue?.id ? 'Update Venue' : 'Create Venue'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}