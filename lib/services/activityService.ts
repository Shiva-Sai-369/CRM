import { createClient } from '@/lib/supabase/client';

/**
 * Service for activity logging
 */
export class ActivityService {
  private supabase = createClient();

  /**
   * Log an activity
   */
  async logActivity(activity: any) {
    return await this.supabase
      .from('activity_logs')
      .insert([activity])
      .select()
      .single();
  }

  /**
   * Get activities for a company (admin view)
   */
  async getCompanyActivities(companyId: string, limit: number = 50) {
    return await this.supabase
      .from('activity_logs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);
  }

  /**
   * Get activities for a specific worker
   */
  async getWorkerActivities(workerId: string, limit: number = 50) {
    return await this.supabase
      .from('activity_logs')
      .select('*')
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false })
      .limit(limit);
  }

  /**
   * Get activities for a specific customer
   */
  async getCustomerActivities(customerId: string) {
    return await this.supabase
      .from('activity_logs')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
  }

  /**
   * Helper methods for common activities
   */
  async logCustomerCreated(companyId: string, workerId: string, customerId: string, customerName: string) {
    return this.logActivity({
      company_id: companyId,
      worker_id: workerId,
      customer_id: customerId,
      action: 'Customer Created',
      details: `Created customer: ${customerName}`,
    });
  }

  async logCustomerUpdated(companyId: string, workerId: string, customerId: string, customerName: string) {
    return this.logActivity({
      company_id: companyId,
      worker_id: workerId,
      customer_id: customerId,
      action: 'Customer Updated',
      details: `Updated customer: ${customerName}`,
    });
  }

  async logLeadStatusChanged(
    companyId: string,
    workerId: string,
    customerId: string,
    customerName: string,
    oldStatus: string,
    newStatus: string
  ) {
    return this.logActivity({
      company_id: companyId,
      worker_id: workerId,
      customer_id: customerId,
      action: 'Lead Status Changed',
      details: `Changed ${customerName} status from "${oldStatus}" to "${newStatus}"`,
    });
  }

  async logCustomerAssigned(
    companyId: string,
    adminId: string,
    customerId: string,
    customerName: string,
    workerName: string
  ) {
    return this.logActivity({
      company_id: companyId,
      worker_id: adminId,
      customer_id: customerId,
      action: 'Customer Assigned',
      details: `Assigned ${customerName} to ${workerName}`,
    });
  }

  async logWorkerCreated(companyId: string, adminId: string, workerName: string) {
    return this.logActivity({
      company_id: companyId,
      worker_id: adminId,
      action: 'Worker Created',
      details: `Created worker account: ${workerName}`,
    });
  }

  async logWorkerDeleted(companyId: string, adminId: string, workerName: string) {
    return this.logActivity({
      company_id: companyId,
      worker_id: adminId,
      action: 'Worker Deleted',
      details: `Deleted worker account: ${workerName}`,
    });
  }

  async logTaskCompleted(companyId: string, workerId: string, customerId: string, taskTitle: string) {
    return this.logActivity({
      company_id: companyId,
      worker_id: workerId,
      customer_id: customerId,
      action: 'Task Completed',
      details: `Completed task: ${taskTitle}`,
    });
  }

  async logNoteAdded(companyId: string, workerId: string, customerId: string, customerName: string) {
    return this.logActivity({
      company_id: companyId,
      worker_id: workerId,
      customer_id: customerId,
      action: 'Note Added',
      details: `Added note to ${customerName}`,
    });
  }
}

export const activityService = new ActivityService();
