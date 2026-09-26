export function findUser(db: any, name: string) {
  return db.query("SELECT * FROM users WHERE name = '" + name + "'");
}
