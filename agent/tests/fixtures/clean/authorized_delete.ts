export async function deleteAccount(req: any, db: any) {
  if (req.user?.id !== req.params.id) throw new Error("forbidden");
  return db.accounts.delete({ where: { id: req.user.id } });
}
