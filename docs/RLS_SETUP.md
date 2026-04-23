# Supabase RLS Policy Setup Instructions

Now that the app uses Supabase Auth, we can properly set up RLS policies that will work correctly.

## Steps to Setup RLS Policies:

### 1. **Enable RLS on the "noDue Documents" Bucket**

Go to your Supabase Dashboard:
- Navigate to **Storage** → **"noDue Documents"** bucket
- Click the three-dot menu (⋮) → **Policies**
- You should see a toggle to **Enable RLS** (if it's currently disabled, enable it)

### 2. **Create INSERT Policy**

- Click **New Policy**
- **Name:** `Allow authenticated users to upload`
- **Target roles:** `authenticated`
- **Operation:** `INSERT`
- **USING expression:** Leave empty or put `true()`
- **WITH CHECK expression:**
  ```sql
  (bucket_id = 'noDue Documents'::text) AND 
  ((auth.uid())::text = (storage.foldername(name))[1])
  ```
- **Save**

### 3. **Create SELECT Policy**

- Click **New Policy**
- **Name:** `Allow users to view their own files`
- **Target roles:** `authenticated`
- **Operation:** `SELECT`
- **USING expression:**
  ```sql
  (bucket_id = 'noDue Documents'::text) AND 
  ((auth.uid())::text = (storage.foldername(name))[1])
  ```
- **WITH CHECK expression:** Leave empty
- **Save**

### 4. **Create UPDATE Policy**

- Click **New Policy**
- **Name:** `Allow users to update their own files`
- **Target roles:** `authenticated`
- **Operation:** `UPDATE`
- **USING expression:**
  ```sql
  (bucket_id = 'noDue Documents'::text) AND 
  ((auth.uid())::text = (storage.foldername(name))[1])
  ```
- **WITH CHECK expression:**
  ```sql
  (bucket_id = 'noDue Documents'::text) AND 
  ((auth.uid())::text = (storage.foldername(name))[1])
  ```
- **Save**

### 5. **Create DELETE Policy** (Optional)

- If you want users to be able to delete their own files:
- **Name:** `Allow users to delete their own files`
- **Target roles:** `authenticated`
- **Operation:** `DELETE`
- **USING expression:**
  ```sql
  (bucket_id = 'noDue Documents'::text) AND 
  ((auth.uid())::text = (storage.foldername(name))[1])
  ```
- **WITH CHECK expression:** Leave empty
- **Save**

---

## How This Works:

- **`auth.uid()`** — Returns the current Supabase user's UUID (now matches User.id in Prisma)
- **`storage.foldername(name)[1]`** — Extracts the first folder level in the path (the userId)
- **Files are stored as:** `{userId}/{category}/{timestamp}_{filename}`
- **RLS ensures:** Users can only access/modify files in their own `{userId}` folder

## Testing:

1. Log in as a user
2. Try uploading a file — should work now!
3. Try accessing files via raw URL — should be blocked if not your file
4. Test with another user account — verify you can't see their files

---

## Troubleshooting:

If uploads still fail after setup:
1. Verify **RLS is enabled** on the bucket
2. Verify **all 4 policies exist** and are set to `authenticated` role
3. Check browser console for exact error message
4. In Supabase dashboard, go to **SQL Editor** and run:
   ```sql
   SELECT * FROM storage.bucket WHERE name = 'noDue Documents';
   ```
   Verify `is_public_bucket` is `false` (RLS enabled)

