import {
  GraphQLString,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLList,
  GraphQLInputObjectType,
  GraphQLFloat
} from 'graphql';
import {
  mutationWithClientMutationId
} from 'graphql-relay';

import {
  defaultSchema,
  refs
} from '../util/firebase.util';

const RegularItemType = new GraphQLInputObjectType({
  name: 'regularItemInput',
  description: 'Registerd item in node.',
  fields: () => ({
    iId: { type: new GraphQLNonNull(GraphQLString) },
    n: { type: new GraphQLNonNull(GraphQLString) },
    p: { type: new GraphQLNonNull(GraphQLInt) },
    cnt: { type: new GraphQLNonNull(GraphQLInt) },
  })
});

const CustomItemType = new GraphQLInputObjectType({
  name: 'customItemInput',
  description: 'User customed item.',
  fields: () => ({
    manu: { type: GraphQLString },
    n: { type: new GraphQLNonNull(GraphQLString) },
    cnt: { type: new GraphQLNonNull(GraphQLInt) }
  })
});

const DestType = new GraphQLInputObjectType({
  name: 'destInput',
  description: 'Destination of order.',
  fields: () => ({
    n1: { type: new GraphQLNonNull(GraphQLString) },
    n2: { type: GraphQLString },
    lat: { type: new GraphQLNonNull(GraphQLFloat) },
    lon: { type: new GraphQLNonNull(GraphQLFloat) },
  })
});

const userCreateOrderMutation = {
  name: 'userCreateOrder',
  inputFields: {
    nId: { type: new GraphQLNonNull(GraphQLString) },
    regItems: { type: new GraphQLList(RegularItemType) },
    customItems: { type: new GraphQLList(CustomItemType) },
    dest: { type: new GraphQLNonNull(DestType) },
    dC: { type: new GraphQLNonNull(GraphQLInt) },
    rC: { type: new GraphQLNonNull(GraphQLInt) },
    curr: { type: new GraphQLNonNull(GraphQLString) }
  },
  outputFields: {
    result: {
      type: GraphQLString,
      resolve: payload => payload.result
    }
  },
  mutateAndGetPayload: ({ nId, regItems, customItems, dC, dest, rC, curr }, { user }) => new Promise((resolve, reject) => {
    if (user) {
        // Create new order root in firebase.

      if (regItems.length === 0 && customItems.length === 0) {
        // if there is no item.
        reject('There is no items selected.');
      }
      const newRef = refs.order.root.push();
      const newOrderKey = newRef.key;
      return newRef.set({
        id: newOrderKey,
        oId: user.uid,
        nId,
        dC,
        rC,
        curr,
        // TODO : impl total product price.
        tP: 10000,
        // TODO : impl delivery price calculation logic.
        eDP: 5000,
        cAt: Date.now(),
        ...defaultSchema.order.root,
      })
        // Create new orderPriperties in firebase.
        .then(() => refs.order.dest.child(newOrderKey).set({
          ...dest
        }))
        .then(() => refs.order.regItem.child(newOrderKey).set({
          ...regItems
        }))
        .then(() => refs.order.customItem.child(newOrderKey).set({
          ...customItems
        }))
        .then(() => {
          resolve({ result: newOrderKey });
        })
        .catch(reject);
    }
    return reject('This mutation needs accessToken.');
  })
};

const runnerCatchOrderMutation = {
  name: 'runnerCatchDeliveryOrder',
  inputFields: {
    orderId: { type: new GraphQLNonNull(GraphQLString) }
  },
  outputFields: {
    result: {
      type: GraphQLString,
      resolve: payload => payload.result
    }
  },
  mutateAndGetPayload: ({ orderId }, { user }) => new Promise((resolve, reject) => {
    if (user) {
        // / TODO : Maybe transaction issue will be occurred.
      return refs.order.root.child(orderId).once('value')
          .then((orderSnap) => {
            const order = orderSnap.val();
            if (!order) {
              return reject('Order doesn\'t exist.');
            }
            if (order.oId === user.uid) {
              return reject('Can\'t ship your port.');
            }
            if (order.rId === user.uid) {
              return reject('This ship is already designated for you.');
            }
            if (order.rId) {
              return reject('This ship is already designated for other user.');
            }
            return refs.order.root.child(orderId).child('runnerId').set(user.uid);
          })
          .then(() => {
            resolve({ result: 'OK' });
          });
    }
    return reject('This mutation needs accessToken.');
  })
};

const userEvalOrderMutation = {
  name: 'userEvalOrder',
  description: 'user evaluate order',
  inputFields: {
    oId: { type: new GraphQLNonNull(GraphQLString) },
    m: { type: new GraphQLNonNull(GraphQLInt) },
    comm: { type: new GraphQLNonNull(GraphQLString) }
  },
  outputFields: {
    result: { type: GraphQLString, resolve: payload => payload.result }
  },
  mutateAndGetPayload: ({ oId, m, comm }, { user }) => new Promise((resolve, reject) => {
    if (user) {
      const newRef = refs.order.evalFromUser.child(oId);
      return newRef.child('m').set(m)
      .then(() => newRef.child('comm').set(comm))
      .then(() => resolve({ result: 'OK' }))
      .catch(reject);
    }
    return reject('This mutation needs accessToken.');
  })
};

const runnerEvalOrderMutation = {
  NAME: 'runnerEvalOrder',
  description: 'runner evaluate order',
  inputFields: {
    oId: { type: new GraphQLNonNull(GraphQLString) },
    m: { type: new GraphQLNonNull(GraphQLInt) },
    comm: { type: new GraphQLNonNull(GraphQLString) }
  },
  outputFields: {
    result: { type: GraphQLString, resolve: payload => payload.result }
  },
  mutateAndGetPayload: ({ oId, m, comm }, { user }) => new Promise((resolve, reject) => {
    if (user) {
      const newRef = refs.order.evalFromRunner.child(oId);
      return newRef.child('m').set(m)
      .then(() => newRef.child('comm').set(comm))
      .then(() => resolve({ result: 'OK' }))
      .catch(reject);
    }
    return reject('This mutation needs accessToken.');
  })
};

const OrderMutation = {
  userCreateOrder: mutationWithClientMutationId(userCreateOrderMutation),
  runnerCatchOrder: mutationWithClientMutationId(runnerCatchOrderMutation),
  userEvalOrder: mutationWithClientMutationId(userEvalOrderMutation),
  runnerEvalOrder: mutationWithClientMutationId(runnerEvalOrderMutation)
};

export default OrderMutation;
