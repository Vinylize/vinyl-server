import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import {
  mRefs,
  findData
} from '../sequelize/sequelize.database.util';

const jwtKey = process.env.JWT_KEY;
const jwtExp = process.env.JWT_EXP;

const setToken = user => new Promise((resolve, reject) => {
  const exp = Math.floor(Date.now() / 1000) + Number(jwtExp);
  jwt.sign({ ...user, exp }, jwtKey, { algorithm: 'HS256' }, (err, token) => {
    if (err) return reject(err);
    return resolve({ user: { ...user, exp }, token });
  });
});

const decodeToken = token => new Promise((resolve, reject) => {
  jwt.verify(token, jwtKey, { algorithm: 'HS256' }, (err, user) => {
    if (err) return reject(err);
    return resolve({ user, token });
  });
});

const getAuth = (e, pw, admin = false) => new Promise((resolve, reject) => {
  findData(mRefs.user.root, ['e', 'pw', 'n', 'permission'], { where: { e } })
  .then((users) => {
    if (!bcrypt.compareSync(pw, users[0].pw)) return reject('Password or email is wrong!');
    if (admin && users[0].permission !== 'admin') return reject('You are not an admin.');
    const user = {
      uid: users[0].row_id,
      e: users[0].e,
      n: users[0].n,
      permission: users[0].permission
    };
    return setToken(user)
    .then(result => resolve({ user: result.user, token: result.token }))
    .catch(reject);
  })
  .catch(() => reject('Paassword or email is wrong!'));
});

export {
  setToken,
  decodeToken,
  getAuth
};
