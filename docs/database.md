# Database Design

# Users

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| id | Integer | ✅ | Unique user ID |
| full_name | String | ✅ | User's full name |
| username | String | ✅ | Unique username |
| email | String | ✅ | Used for login |
| password | String | ✅ | Hashed password |
| profile_picture | String | ❌ | Profile image URL |
| created_at | DateTime | ✅ | Account creation date |

---

# Projects

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| id | Integer | ✅ | Unique project ID |
| project_name | String | ✅ | Name of the project |
| description | Text | ❌ | Project description |
| owner_id | Integer | ✅ | References Users.id |
| status | String | ✅ | Active, Completed, On Hold |
| priority | String | ❌ | High, Medium, Low |
| deadline | Date | ❌ | Project deadline |
| created_at | DateTime | ✅ | Project creation date |

---

# Tasks

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| id | Integer | ✅ | Unique task ID (Primary Key) |
| task_name | String | ✅ | Task title |
| task_description | Text | ❌ | Task details |
| assigned_user_id | Integer | ❌ | References Users.id (Foreign Key) |
| reviewed_by_user_id | Integer | ❌ | References Users.id (Foreign Key) |
| project_id | Integer | ✅ | References Projects.id (Foreign Key) |
| status | String | ✅ | To Do, In Progress, Review, Done |
| deadline | Date | ❌ | Task deadline |
| created_at | DateTime | ✅ | Task creation date |

---

# ProjectMembers

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| project_id | Integer | ✅ | References Projects.id (Foreign Key) |
| user_id | Integer | ✅ | References Users.id (Foreign Key) |
| role | String | ✅ | Owner, Admin, Member |

---

# Comments

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| id | Integer | ✅ | Unique comment ID (Primary Key) |
| comment | Text | ✅ | Content of the comment |
| commented_by_user_id | Integer | ✅ | References Users.id (Foreign Key) |
| task_id | Integer | ✅ | References Tasks.id (Foreign Key) |
| created_at | DateTime | ✅ | Date and time when the comment was created |
| updated_at | DateTime | ❌ | Date and time when the comment was last edited |
| deleted_at | DateTime | ❌ | Date and time when the comment was deleted. NULL means the comment is still active. |

### Design Decisions

- Comments are linked to tasks using `task_id`.
- The author of a comment is stored using `commented_by_user_id`.
- Instead of permanently deleting comments, TeamFlow uses `deleted_at` (soft delete).
- `deleted_at = NULL` means the comment is active.
- `updated_at` records the last edit time, allowing users to see when a comment was modified.

---

# Notifications

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| id | Integer | ✅ | Unique notification ID (Primary Key) |
| recipient_user_id | Integer | ✅ | User who receives the notification (FK → Users.id) |
| sender_user_id | Integer | ❌ | User who triggered the notification (FK → Users.id) |
| message | Text | ✅ | Notification message displayed to the user |
| type | String | ✅ | Type of notification (task_assigned, comment_added, etc.) |
| task_id | Integer | ❌ | Related task (FK → Tasks.id) |
| project_id | Integer | ❌ | Related project (FK → Projects.id) |
| read_at | DateTime | ❌ | When the notification was read. NULL = unread |
| created_at | DateTime | ✅ | Notification creation date and time |
| deleted_at | DateTime | ❌ | Soft delete timestamp. NULL = active notification |

### Design Decisions

- Notifications are linked to a recipient using `recipient_user_id`.
- The user who triggered the notification is stored in `sender_user_id`.
- Different notification events are identified using the `type` field.
- `task_id` and `project_id` allow the app to open the correct screen when a notification is clicked.
- `read_at = NULL` means the notification is unread.
- Notifications use soft deletion through `deleted_at` instead of being immediately removed.

---

# ActivityLogs

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| id | Integer | ✅ | Unique activity log ID (Primary Key) |
| user_id | Integer | ✅ | User who performed the activity (FK → Users.id) |
| activity_type | String | ✅ | Type of activity (created_project, assigned_task, etc.) |
| project_id | Integer | ❌ | Related project (FK → Projects.id) |
| task_id | Integer | ❌ | Related task (FK → Tasks.id) |
| created_at | DateTime | ✅ | Date and time when the activity occurred |

### Design Decisions

- Activity logs record every important action performed in TeamFlow.
- They provide a history of user actions for transparency and debugging.
- Activity logs are **not deleted** in the current implementation.
- Future versions may archive or purge very old logs to improve performance.

---

# Future Improvements

## Projects

- Support multiple project owners by storing the Owner role in the ProjectMembers table instead of using `owner_id`.

## Activity Logs

- Archive activity logs after one year.
- Permanently remove archived logs after a configurable retention period.

## Notifications

- Support notification categories.
- Allow users to mute specific notification types.