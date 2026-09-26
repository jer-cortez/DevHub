export async function deleteAccount(req: any, db: any) {
  return db.accounts.delete({ where: { id: req.params.id } });
}
