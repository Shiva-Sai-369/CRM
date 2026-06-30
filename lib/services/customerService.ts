import { createClient } from '@/lib/supabase/client';

/**
 * Service for customer-related database operations
 */
export class CustomerService {
  private supabase = createClient();

  /**
   * Get all customers for a company (admin only)
   */
  async getCustomersByCompany(companyId: string) {
    return await this.supabase
      .from('customers')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
  }

  /**
   * Get customers assigned to a specific worker
   */
  async getCustomersByWorker(workerId: string) {
    return await this.supabase
      .from('customers')
      .select('*')
      .eq('assigned_worker', workerId)
      .order('created_at', { ascending: false });
  }

  /**
   * Get a single customer by ID
   */
  async getCustomerById(customerId: string) {
    return await this.supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();
  }

  /**
   * Create a new customer
   */
  async createCustomer(customer: any) {
    return await this.supabase
      .from('customers')
      .insert([customer])
      .select()
      .single();
  }

  /**
   * Update a customer
   */
  async updateCustomer(customerId: string, updates: any) {
    return await this.supabase
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .select()
      .single();
  }

  /**
   * Delete a customer (admin only)
   */
  async deleteCustomer(customerId: string) {
    return await this.supabase
      .from('customers')
      .delete()
      .eq('id', customerId);
  }

  /**
   * Assign a customer to a worker
   */
  async assignCustomer(customerId: string, workerId: string | null) {
    return this.updateCustomer(customerId, { assigned_worker: workerId });
  }

  /**
   * Bulk import customers
   */
  async bulkImportCustomers(customers: any[]) {
    return await this.supabase
      .from('customers')
      .insert(customers)
      .select();
  }

  /**
   * Search customers by name, email, or phone
   */
  async searchCustomers(companyId: string, query: string) {
    return await this.supabase
      .from('customers')
      .select('*')
      .eq('company_id', companyId)
      .or(`customer_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(companyId: string) {
    const { data: customers, error } = await this.supabase
      .from('customers')
      .select('lead_status')
      .eq('company_id', companyId);

    if (error) throw error;

    const stats = customers.reduce((acc: any, customer: any) => {
      const status = customer.lead_status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return stats;
  }
}

export const customerService = new CustomerService();
