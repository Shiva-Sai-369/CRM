# Lead Status History - Requirements Document

## Introduction

This feature enables tracking of lead status changes within the CRM system. It captures who changed the lead's status and when the change occurred, providing a complete audit trail viewable in the lead detail page. This complements the existing notes history functionality and provides transparency into lead progression through sales stages.

## Glossary

- **Lead**: A prospective customer or contact record in the CRM system
- **Status**: The current sales stage or workflow state of a lead (e.g., "New Lead", "Contacted", "Qualified", "Converted")
- **Status Change**: When a lead's status field is modified from one value to another
- **Status History**: An audit trail recording all status changes for a lead with metadata
- **Change Author**: The user who initiated the status change
- **Change Timestamp**: The exact date and time a status change occurred
- **Lead Detail Page**: The expanded view showing all information about a single lead, including notes and history
- **Audit Trail**: A complete record of status changes enabling traceability and accountability

## Requirements

### Requirement 1: Capture Status Change Events

**User Story:** As a team manager, I want to track when lead statuses are changed, so that I can maintain an audit trail of lead progression through the sales pipeline.

#### Acceptance Criteria

1. WHEN a lead's status is changed via the StatusDropdown component, THE System SHALL create a status history record
2. THE status history record SHALL include the previous status value
3. THE status history record SHALL include the new status value
4. THE status history record SHALL capture the timestamp of when the change occurred (in ISO 8601 format)
5. THE status history record SHALL be persisted to the database immediately after the status update completes successfully

### Requirement 2: Capture Change Author Information

**User Story:** As a CRM administrator, I want to know who changed a lead's status, so that I can track accountability and contact the team member if needed.

#### Acceptance Criteria

1. WHEN a status change is created, THE System SHALL capture the user ID of the authenticated user making the change
2. THE System SHALL also capture the user's full name and email address for display purposes
3. THE captured user information SHALL be derived from the authenticated session (via auth.ts middleware)
4. IF the user's full name is unavailable, THE System SHALL display the user's email address as a fallback
5. THE System SHALL never display NULL or missing user identifiers; all changes SHALL have a valid author attribution

### Requirement 3: Store Status History in Database

**User Story:** As a developer, I want a persistent storage mechanism for status changes, so that the history survives application restarts and is queryable.

#### Acceptance Criteria

1. THE System SHALL create a `lead_status_history` table in Supabase with the following columns:
   - `id` (integer, primary key, auto-increment)
   - `lead_id` (integer, foreign key to sheet_leads.id)
   - `previous_status` (text, nullable - null for the first status change)
   - `new_status` (text, not null)
   - `changed_by_user_id` (text, user ID from auth)
   - `changed_by_name` (text, user's full name)
   - `changed_by_email` (text, user's email address)
   - `created_at` (timestamp with timezone, auto-set to current timestamp)
2. THE `lead_id` foreign key SHALL have cascading delete enabled so that deleting a lead removes its status history
3. THE table SHALL have indexes on `lead_id` and `created_at` to optimize query performance
4. THE System SHALL enforce that `new_status` is never NULL and `lead_id` is never NULL

### Requirement 4: Fetch Status History for a Lead

**User Story:** As a sales representative, I want to see the complete status change history when viewing a lead, so that I can understand the lead's journey through our pipeline.

#### Acceptance Criteria

1. WHEN the lead detail page is displayed, THE System SHALL fetch all status history records for that lead ordered by creation date (newest first)
2. WHEN fetching status history, THE System SHALL retrieve records efficiently using indexed queries
3. IF a lead has no status history records, THE System SHALL return an empty array without error
4. THE fetched status history SHALL include all fields needed for display (previous_status, new_status, changed_by_name, changed_by_email, created_at)
5. WHEN status history records exceed 1000 per lead, THE System SHALL implement pagination or lazy-loading to prevent performance degradation

### Requirement 5: Display Status History in Lead Detail Page

**User Story:** As a sales representative, I want to see a formatted history of status changes in the lead detail page, so that I can quickly understand how a lead has progressed.

#### Acceptance Criteria

1. THE LeadRow expanded view SHALL display a "Status History" section alongside the existing "Notes History" section
2. THE Status History section SHALL show status changes in reverse chronological order (newest first)
3. EACH status history entry SHALL display:
   - The date and time of the change (formatted as "MMM DD, YYYY HH:mm" or relative format like "2 hours ago")
   - The previous status value (or "—" if this is the first status change)
   - An arrow or visual indicator showing the transition
   - The new status value with its corresponding color badge (consistent with StatusDropdown styling)
   - The name or email of the user who made the change
4. IF no status history exists for a lead, THE System SHALL display a message stating "No status changes yet"
5. THE Status History section SHALL have a visual design consistent with the existing Notes History section (similar styling, spacing, typography)

### Requirement 6: Update Lead Details API to Trigger Status Change Recording

**User Story:** As a developer, I want the status change mechanism to be centralized, so that status history is captured reliably regardless of how the status is updated.

#### Acceptance Criteria

1. THE `updateLeadStatus` function in projectStore SHALL be modified to automatically create a status history record
2. WHEN `updateLeadStatus` is called, IF the new status differs from the current status, THE System SHALL create a status history record with the authenticated user's information
3. IF `updateLeadStatus` is called with the same status as the current value, THE System SHALL not create a history record (no duplicate entries for no-op changes)
4. THE status history record creation SHALL happen within the same transaction as the status update to ensure consistency
5. IF the history record creation fails, THE System SHALL log the error but allow the status update to succeed (to prevent blocking lead updates)

### Requirement 7: Retrieve Status History from Zustand Store

**User Story:** As a component developer, I want access to status history data through the project store, so that I can efficiently render status history in the UI.

#### Acceptance Criteria

1. THE ProjectStoreState interface SHALL be extended with a new field `leadStatusHistory` (type: `Record<number, StatusHistoryRecord[]>`)
2. THE projectStore SHALL expose a new action `fetchStatusHistoryForLead(leadId: number): Promise<void>` to retrieve history records
3. THE projectStore SHALL expose a new action `clearStatusHistoryCache()` to clear cached history (for memory management)
4. THE `fetchStatusHistoryForLead` action SHALL fetch status history from Supabase and populate the store
5. THE Status History components SHALL retrieve data from the store rather than making direct Supabase queries

## Parser and Serializer Requirements

This feature does not require explicit parsers or serializers. Status history data is stored in its final form in Supabase and retrieved as-is without format transformation.

