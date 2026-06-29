-- Admins mogen alle objecten van hun kantoor wijzigen en verwijderen
-- (Batch 2 fix: de bestaande update-policy laat alleen de makelaar zijn eigen object wijzigen)

create policy "admin mag kantoor-objecten wijzigen"
  on objecten for update
  using (
    kantoor_id in (
      select kantoor_id from makelaars
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "makelaar mag eigen object verwijderen"
  on objecten for delete
  using (makelaar_id = auth.uid());

create policy "admin mag kantoor-objecten verwijderen"
  on objecten for delete
  using (
    kantoor_id in (
      select kantoor_id from makelaars
      where id = auth.uid() and role = 'admin'
    )
  );
