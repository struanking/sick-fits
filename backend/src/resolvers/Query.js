const { forwardTo } = require("prisma-binding");
const { hasPermission } = require("../utils");

const Query = {
  items: forwardTo("db"),
  item: forwardTo("db"),
  itemsConnection: forwardTo("db"),
  // shorthand ES6 syntax
  me(parent, args, ctx, info) {
    // check if there's a current user ID
    if (!ctx.request.userId) {
      return null;
    }
    return ctx.db.query.user(
      {
        where: { id: ctx.request.userId }
      },
      info
    );
  },
  async users(parent, args, ctx, info) {
    // 1. check if they are logged in
    if (!ctx.request.userId) {
      throw new Error("You must be logged in");
    }
    // 2. check user has permission to query for users
    hasPermission(ctx.request.user, ["ADMIN", "PERMISSIONUPDATE"]);

    // 3. if they do, query all of the users
    return ctx.db.query.users({}, info);
  },
  async order(parent, args, ctx, info) {
    // 1. make sure logged in
    if (!ctx.request.userId) {
      throw new Error("You must be logged in");
    }
    // 2. Query for current order
    const order = await ctx.db.query.order(
      {
        where: { id: args.id }
      },
      info
    );
    // 3. check user has permission to see order
    const ownsOrder = order.user.id === ctx.request.userId;
    const hasPermissionToSeeOrder = ctx.request.user.permissions.includes(
      "ADMIN"
    );
    if (!ownsOrder || !hasPermissionToSeeOrder) {
      throw new Error("You can't see this!");
    }
    // 4. retutn the order
    return order;
  },
  async orders(parent, args, ctx, info) {
    // 1. Get user
    const { userId } = ctx.request;
    if (!userId) {
      throw new Error("You must be logged in");
    }
    // 2. Query for user's orders
    return ctx.db.query.orders(
      {
        where: {
          user: { id: userId }
        }
      },
      info
    );
  }
};

module.exports = Query;
