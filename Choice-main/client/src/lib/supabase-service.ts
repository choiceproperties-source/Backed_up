import { supabase } from './supabase';
import type { Property, Review } from './types';

// ===================== PROPERTIES =====================
export async function getProperties(): Promise<Property[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*');
    if (error) throw error;
    return data || [];
  } catch (err) {
    return [];
  }
}

export async function getPropertyById(id: string): Promise<Property | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data || null;
  } catch (err) {
    return null;
  }
}

export async function createProperty(property: Omit<Property, 'id'>): Promise<Property | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('properties')
      .insert([property])
      .select()
      .single();
    if (error) throw error;
    return data || null;
  } catch (err) {
    return null;
  }
}

export async function updateProperty(id: string, updates: Partial<Property>): Promise<Property | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data || null;
  } catch (err) {
    return null;
  }
}

export async function deleteProperty(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    return false;
  }
}

// ===================== APPLICATIONS =====================
export async function getApplications(userId?: string) {
  if (!supabase) return [];
  try {
    let query = supabase.from('applications').select(`
      *,
      properties:property_id (
        id, title, address, city, state, price, bedrooms, bathrooms, images, status, property_type
      ),
      users:user_id (
        id, full_name, email
      )
    `);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data?.map(app => ({
      ...app,
      property: app.properties
    })) || [];
  } catch (err) {
    return [];
  }
}

export async function createApplication(application: any) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('applications')
      .insert([application])
      .select()
      .single();
    if (error) throw error;
    return data || null;
  } catch (err) {
    return null;
  }
}

export async function updateApplication(id: string, updates: any) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data || null;
  } catch (err) {
    return null;
  }
}

// ===================== REVIEWS =====================
export async function getReviews(propertyId: string): Promise<Review[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('property_id', propertyId);
    if (error) throw error;
    return data || [];
  } catch (err) {
    return [];
  }
}

export async function createReview(review: Omit<Review, 'id'>) {
  if (!supabase) return null;
  try {
    // Let Supabase generate UUID - do not provide manual ID
    const { data, error } = await supabase
      .from('reviews')
      .insert([review])
      .select()
      .single();
    if (error) throw error;
    return data || null;
  } catch (err) {
    return null;
  }
}

// ===================== FAVORITES =====================
export async function getFavorites(userId: string) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('property_id')
      .eq('user_id', userId);
    if (error) throw error;
    return data?.map(f => f.property_id) || [];
  } catch (err) {
    return [];
  }
}

export async function getFavoritesWithProperties(userId: string) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        id,
        property_id,
        created_at,
        properties:property_id (
          id, title, address, city, state, price, bedrooms, bathrooms, images, status, property_type, square_feet
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data?.map(fav => ({
      ...fav,
      property: fav.properties
    })) || [];
  } catch (err) {
    return [];
  }
}

export async function addFavorite(userId: string, propertyId: string) {
  if (!supabase) return false;
  try {
    // Let Supabase generate UUID - do not provide manual ID
    const { error } = await supabase
      .from('favorites')
      .insert([{ user_id: userId, property_id: propertyId }]);
    if (error) throw error;
    return true;
  } catch (err) {
    return false;
  }
}

export async function removeFavorite(userId: string, propertyId: string) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId);
    if (error) throw error;
    return true;
  } catch (err) {
    return false;
  }
}

// ===================== INQUIRIES =====================
export async function createInquiry(inquiry: any) {
  if (!supabase) return null;
  try {
    // Let Supabase generate UUID - do not provide manual ID
    const { data, error } = await supabase
      .from('inquiries')
      .insert([inquiry])
      .select()
      .single();
    if (error) throw error;
    return data || null;
  } catch (err) {
    return null;
  }
}

export async function getInquiries() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('inquiries')
      .select('*');
    if (error) throw error;
    return data || [];
  } catch (err) {
    return [];
  }
}

// ===================== USERS =====================
export async function getCurrentUserProfile() {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data || null;
  } catch (err) {
    return null;
  }
}

export async function updateUserProfile(userId: string, updates: any) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data || null;
  } catch (err) {
    return null;
  }
}

export async function getAllUsers() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    return [];
  }
}

export async function updateUserRole(userId: string, role: string) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data || null;
  } catch (err) {
    return null;
  }
}

// ===================== FILE UPLOADS =====================
export async function uploadPropertyImage(file: File, propertyId: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${propertyId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage
      .from('property-images')
      .getPublicUrl(fileName);
    
    return data.publicUrl;
  } catch (err) {
    return null;
  }
}

export async function uploadProfileImage(file: File, userId: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/profile.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(fileName, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName);
    
    return data.publicUrl;
  } catch (err) {
    return null;
  }
}

export async function uploadDocument(file: File, userId: string, applicationId: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${applicationId}/${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    return fileName;
  } catch (err) {
    return null;
  }
}

export async function getDocumentUrl(filePath: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600);
    
    if (error) throw error;
    return data.signedUrl;
  } catch (err) {
    return null;
  }
}

export async function deletePropertyImages(propertyId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data: files } = await supabase.storage
      .from('property-images')
      .list(propertyId);
    
    if (files && files.length > 0) {
      const filePaths = files.map(f => `${propertyId}/${f.name}`);
      await supabase.storage.from('property-images').remove(filePaths);
    }
    
    return true;
  } catch (err) {
    return false;
  }
}

// ===================== REQUIREMENTS =====================
export async function createRequirement(requirement: any) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('requirements')
      .insert([requirement])
      .select()
      .single();
    if (error) throw error;
    return data || null;
  } catch (err) {
    return null;
  }
}

export async function getRequirements(userId?: string) {
  if (!supabase) return [];
  try {
    let query = supabase.from('requirements').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    return [];
  }
}

// ===================== AGENT DASHBOARD =====================
export async function getAgentProperties(agentId: string) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', agentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    return [];
  }
}

export async function getApplicationsForProperty(propertyId: string) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    return [];
  }
}

export async function getAgentInquiries(agentId: string) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    return [];
  }
}

export async function updateInquiryStatus(inquiryId: string, status: string) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('inquiries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', inquiryId)
      .select()
      .single();
    if (error) throw error;
    return data || null;
  } catch (err) {
    return null;
  }
}

// ===================== ADMIN DASHBOARD =====================
export async function getAdminStats() {
  if (!supabase) return null;
  try {
    const [properties, users, applications, reviews, inquiries] = await Promise.all([
      supabase.from('properties').select('id, property_type, status, price', { count: 'exact' }),
      supabase.from('users').select('id, role', { count: 'exact' }),
      supabase.from('applications').select('id, status', { count: 'exact' }),
      supabase.from('reviews').select('id, rating', { count: 'exact' }),
      supabase.from('inquiries').select('id, status', { count: 'exact' })
    ]);
    
    return {
      totalProperties: properties.count || 0,
      totalUsers: users.count || 0,
      totalApplications: applications.count || 0,
      totalReviews: reviews.count || 0,
      totalInquiries: inquiries.count || 0,
      properties: properties.data || [],
      users: users.data || [],
      applications: applications.data || [],
      reviews: reviews.data || [],
      inquiries: inquiries.data || []
    };
  } catch (err) {
    return null;
  }
}

export async function getAllReviews() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, users(full_name, email), properties(title)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    return [];
  }
}

export async function deleteReview(reviewId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);
    if (error) throw error;
    return true;
  } catch (err) {
    return false;
  }
}

// ===================== ADMIN USER MANAGEMENT =====================
export async function createUser(userData: { email: string; full_name: string; role: string }) {
  if (!supabase) return null;
  try {
    // Let Supabase generate UUID - do not provide manual ID
    const { data, error } = await supabase
      .from('users')
      .insert([{ 
        ...userData, 
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    if (error) throw error;
    return data || null;
  } catch (err) {
    return null;
  }
}

export async function deleteUser(userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    if (error) throw error;
    return true;
  } catch (err) {
    return false;
  }
}

// ===================== SAVED SEARCHES =====================
export async function getSavedSearches() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*, users(full_name, email)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    return [];
  }
}

export async function deleteSavedSearch(searchId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', searchId);
    if (error) throw error;
    return true;
  } catch (err) {
    return false;
  }
}

// ===================== ADMIN PERSONA MANAGEMENT =====================
export async function getManagedPersonas() {
  try {
    const response = await fetch('/api/admin/personas', {
      headers: {
        'Authorization': `Bearer ${(await supabase?.auth.getSession())?.data.session?.access_token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch personas');
    return result.data || [];
  } catch (err) {
    console.error('getManagedPersonas error:', err);
    return [];
  }
}

export async function createManagedPersona(personaData: {
  fullName: string;
  email: string;
  displayEmail?: string;
  displayPhone?: string;
  role?: string;
  bio?: string;
  profileImage?: string;
  location?: string;
  specialties?: string[];
  yearsExperience?: number;
}) {
  try {
    const response = await fetch('/api/admin/personas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase?.auth.getSession())?.data.session?.access_token}`,
      },
      body: JSON.stringify(personaData),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to create persona');
    return result.data;
  } catch (err: any) {
    console.error('createManagedPersona error:', err);
    throw err;
  }
}

export async function updateManagedPersona(personaId: string, updates: {
  fullName?: string;
  displayEmail?: string;
  displayPhone?: string;
  role?: string;
  bio?: string;
  profileImage?: string;
  location?: string;
  specialties?: string[];
  yearsExperience?: number;
}) {
  try {
    const response = await fetch(`/api/admin/personas/${personaId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase?.auth.getSession())?.data.session?.access_token}`,
      },
      body: JSON.stringify(updates),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update persona');
    return result.data;
  } catch (err: any) {
    console.error('updateManagedPersona error:', err);
    throw err;
  }
}

export async function deleteManagedPersona(personaId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/admin/personas/${personaId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${(await supabase?.auth.getSession())?.data.session?.access_token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete persona');
    return true;
  } catch (err) {
    console.error('deleteManagedPersona error:', err);
    return false;
  }
}

export async function getAdminSettings() {
  try {
    const response = await fetch('/api/admin/settings', {
      headers: {
        'Authorization': `Bearer ${(await supabase?.auth.getSession())?.data.session?.access_token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch settings');
    return result.data || {};
  } catch (err) {
    console.error('getAdminSettings error:', err);
    return {};
  }
}

export async function saveAdminSetting(key: string, value: string) {
  try {
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase?.auth.getSession())?.data.session?.access_token}`,
      },
      body: JSON.stringify({ key, value }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to save setting');
    return result.data;
  } catch (err: any) {
    console.error('saveAdminSetting error:', err);
    throw err;
  }
}

// ===================== MODERATION =====================

export async function getContentReports() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('content_reports')
      .select(`
        *,
        reporter:reporter_id(id, full_name, email),
        property:property_id(id, title, address),
        review:review_id(id, comment, rating),
        assigned:assigned_to(id, full_name)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getContentReports error:', err);
    return [];
  }
}

export async function createContentReport(report: {
  propertyId?: string;
  reviewId?: string;
  reportType: string;
  description?: string;
}) {
  if (!supabase) return null;
  try {
    const { data: session } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from('content_reports')
      .insert([{
        reporter_id: session?.session?.user?.id,
        property_id: report.propertyId,
        review_id: report.reviewId,
        report_type: report.reportType,
        description: report.description,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('createContentReport error:', err);
    return null;
  }
}

export async function updateContentReport(id: string, updates: {
  status?: string;
  priority?: string;
  assignedTo?: string;
  resolution?: string;
}) {
  if (!supabase) return null;
  try {
    const updateData: Record<string, any> = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.assignedTo) updateData.assigned_to = updates.assignedTo;
    if (updates.resolution) {
      updateData.resolution = updates.resolution;
      updateData.resolved_at = new Date().toISOString();
      const { data: session } = await supabase.auth.getSession();
      updateData.resolved_by = session?.session?.user?.id;
    }
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('content_reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('updateContentReport error:', err);
    return null;
  }
}

export async function getDisputes() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        initiator:initiator_id(id, full_name, email),
        respondent:respondent_id(id, full_name, email),
        property:property_id(id, title),
        application:application_id(id, status),
        assigned:assigned_to(id, full_name)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getDisputes error:', err);
    return [];
  }
}

export async function createDispute(dispute: {
  respondentId?: string;
  propertyId?: string;
  applicationId?: string;
  disputeType: string;
  subject: string;
  description: string;
}) {
  if (!supabase) return null;
  try {
    const { data: session } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from('disputes')
      .insert([{
        initiator_id: session?.session?.user?.id,
        respondent_id: dispute.respondentId,
        property_id: dispute.propertyId,
        application_id: dispute.applicationId,
        dispute_type: dispute.disputeType,
        subject: dispute.subject,
        description: dispute.description,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('createDispute error:', err);
    return null;
  }
}

export async function updateDispute(id: string, updates: {
  status?: string;
  priority?: string;
  assignedTo?: string;
  resolution?: string;
}) {
  if (!supabase) return null;
  try {
    const updateData: Record<string, any> = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.assignedTo) updateData.assigned_to = updates.assignedTo;
    if (updates.resolution) {
      updateData.resolution = updates.resolution;
      updateData.resolved_at = new Date().toISOString();
      const { data: session } = await supabase.auth.getSession();
      updateData.resolved_by = session?.session?.user?.id;
    }
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('disputes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('updateDispute error:', err);
    return null;
  }
}

export async function getDisputeMessages(disputeId: string) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('dispute_messages')
      .select(`
        *,
        sender:sender_id(id, full_name, email)
      `)
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getDisputeMessages error:', err);
    return [];
  }
}

export async function addDisputeMessage(disputeId: string, message: string, isInternal: boolean = false) {
  if (!supabase) return null;
  try {
    const { data: session } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from('dispute_messages')
      .insert([{
        dispute_id: disputeId,
        sender_id: session?.session?.user?.id,
        message,
        is_internal: isInternal,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('addDisputeMessage error:', err);
    return null;
  }
}

export async function getDocumentVerifications() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('document_verifications')
      .select(`
        *,
        user:user_id(id, full_name, email),
        application:application_id(id, status),
        file:file_id(id, filename, original_name, mime_type),
        verifier:verified_by(id, full_name)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getDocumentVerifications error:', err);
    return [];
  }
}

export async function updateDocumentVerification(id: string, updates: {
  status: string;
  rejectionReason?: string;
  notes?: string;
}) {
  if (!supabase) return null;
  try {
    const updateData: Record<string, any> = {
      status: updates.status,
      updated_at: new Date().toISOString(),
    };
    if (updates.rejectionReason) updateData.rejection_reason = updates.rejectionReason;
    if (updates.notes) updateData.notes = updates.notes;
    
    if (updates.status === 'verified' || updates.status === 'rejected') {
      updateData.verified_at = new Date().toISOString();
      const { data: session } = await supabase.auth.getSession();
      updateData.verified_by = session?.session?.user?.id;
    }

    const { data, error } = await supabase
      .from('document_verifications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('updateDocumentVerification error:', err);
    return null;
  }
}

export async function flagPropertyListing(propertyId: string, status: string) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('properties')
      .update({ status })
      .eq('id', propertyId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('flagPropertyListing error:', err);
    return null;
  }
}
