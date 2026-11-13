-- ===== DẤU ẤN: quản trị viên xóa file góp ý (chạy sau supabase-setup-5.sql) =====
drop policy if exists "feedback files: admin xóa" on storage.objects;
create policy "feedback files: admin xóa" on storage.objects
  for delete to authenticated using (bucket_id = 'feedback' and public.is_admin());
