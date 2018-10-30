const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("crypto");
const { promisify } = require("util");
const { transport, makeANiceEmail } = require("../mail");
const { hasPermission } = require("../utils");

const Mutations = {
  async createItem(parent, args, ctx, info) {
    // Check if they are logged in
    if (!ctx.request.userId) {
      throw new Error("You must be logged in to do that!");
    }

    const item = await ctx.db.mutation.createItem(
      {
        data: {
          // this is how to create a relationship between the item and the User
          user: {
            connect: {
              id: ctx.request.userId
            }
          },
          ...args
        }
      },
      info
    );

    console.log(item);

    return item;
  },

  updateItem(parent, args, ctx, info) {
    // first get copy of updates
    const updates = { ...args };
    // remove the ID from the udpates
    delete updates.id;
    // run the update method
    // see updateItem in prisma.graphql
    return ctx.db.mutation.updateItem(
      {
        data: updates,
        where: {
          id: args.id
        }
      },
      info
    );
  },

  async deleteItem(parent, args, ctx, info) {
    const where = { id: args.id };
    // 1. find item
    const item = await ctx.db.query.item(
      { where },
      `
      {
        id
        title
        user { id }
      }
    `
    );
    // 2. check they own it or have permission
    const ownsItem = item.user.id === ctx.request.userId;
    const hasPermissions = ctx.request.user.permissions.some(permission =>
      ["ADMIN", "ITEMDELETE"].includes(permission)
    );
    if (!ownsItem || !hasPermissions) {
      throw new Error("You don't have permission to do that!");
    }
    // 3. delete it
    return ctx.db.mutation.deleteItem({ where }, info);
  },

  async signUp(parent, args, ctx, info) {
    args.email = args.email.toLowerCase();
    const password = await bcrypt.hash(args.password, 10);
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          ...args, // name, email, password etc
          password,
          permissions: { set: ["USER"] }
        }
      },
      info
    );
    // create the JWT for user
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    // set jwt as a cookie on response
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 // one year cookie
    });
    return user;
  },

  async signIn(parent, args, ctx, info) {
    // 1. check if there's a user with that email
    // 2. check the password
    // 3. generate the JWT token
    // 4. Set the cookie with the token
    // 5. return the user
    const { email, password } = args;
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      throw new Error(`No such user found for email ${email}`);
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error("Invalid password");
    }
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 // one year cookie
    });
    return user;
  },

  signOut(parent, args, ctx, info) {
    // check valid user?
    // const user = await ctx.db.query.user({ where: { email } });
    // if (!user) {
    //   throw new Error(`No such user found for email ${email}`);
    // }
    // reset token
    ctx.response.clearCookie("token");
    return { message: "Goodbye!" };
  },

  async requestReset(parent, args, ctx, info) {
    // check real user
    // set a reset token and expiry on that user
    // Email user
    // Return message
    const user = await ctx.db.query.user({ where: { email: args.email } });
    if (!user) {
      throw new Error("No such user found for email");
    }
    const randomBytesPromisified = promisify(randomBytes);
    const resetToken = (await randomBytesPromisified(20)).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
    const res = ctx.db.mutation.updateUser({
      where: { email: args.email },
      data: { resetToken, resetTokenExpiry }
    });
    // could wrap in a try catch
    const mailRes = await transport.sendMail({
      from: "stru@ssdk.com",
      to: user.email,
      subject: "Your password",
      html: makeANiceEmail(`Your password reset token is here!
      \n\n
      <a href="${
        process.env.FRONTEND_URL
      }/reset?resetToken=${resetToken}">Click here to reset</a>`)
    });

    return { message: "Thanks" };
  },

  async resetPassword(parent, args, ctx, info) {
    // 1. check if passwords match
    // 2. check it's legit reset token
    // 3. check if it's expires
    // 4. has new password
    // 5. save the new password
    // 6. generate JWT
    // 7. set the JWT cookie
    // 8. return the new user
    if (args.password !== args.confirmPassword) {
      throw new Error("Passwords do not match");
    }
    const [user] = await ctx.db.query.users({
      where: {
        resetToken: args.resetToken,
        resetTokenExpiry_gte: Date.now() - 3600000
      }
    });
    if (!user) {
      throw new Error("This token is either invalid or expired");
    }
    const password = await bcrypt.hash(args.password, 10);
    const updatedUser = await ctx.db.mutation.updateUser({
      where: { email: user.email },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null
      }
    });
    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
    return updatedUser;
  },

  async updatePermissions(parent, args, ctx, info) {
    // 1. check if logged in
    if (!ctx.request.userId) {
      throw new Error("You must be logged in");
    }
    // 2. query the current user
    const currentUser = await ctx.db.query.user(
      {
        where: {
          id: ctx.request.userId
        }
      },
      info
    );
    // 3. check if they have permissions to update
    hasPermission(currentUser, ["ADMIN", "PERMISSIONUPDATE"]);
    // 4. update
    return ctx.db.mutation.updateUser(
      {
        data: {
          permissions: {
            set: args.permissions
          }
        },
        where: {
          id: args.userId
        }
      },
      info
    );
  },

  async addToCart(parent, args, ctx, info) {
    // 2. User is signed in
    const { userId } = ctx.request;
    if (!userId) {
      throw new Error("You must be signed in");
    }
    // 2. Query the user's current cart
    const [existingCartItem] = await ctx.db.query.cartItems({
      where: {
        user: { id: userId },
        item: { id: args.id }
      }
    });
    // 3. Check if that item is already in cart: inc or
    if (existingCartItem) {
      console.log("This item is already in the cart");
      return ctx.db.mutation.updateCartItem(
        {
          where: { id: existingCartItem.id },
          data: { quantity: existingCartItem.quantity + 1 }
        },
        info
      );
    }

    // 4. add new item
    return ctx.db.mutation.createCartItem(
      {
        data: {
          user: {
            // connect relationship in Prisma
            connect: { id: userId }
          },
          item: {
            connect: { id: args.id }
          }
        }
      },
      info
    );
  },

  async removeFromCart(parent, args, ctx, info) {
    // 1. Find cart item
    const cartItem = await ctx.db.query.cartItem(
      {
        where: {
          id: args.id
        }
      },
      `{ id, user { id } }`
    );

    // 2. Make sure we found item
    if (!cartItem) throw new Error("No cart item found!");

    // 3. Make sure user owns cart
    if (cartItem.user.id !== ctx.request.userId) {
      throw new Error("Cheatin huh?");
    }

    // 3. Delete cart item
    return ctx.db.mutation.deleteCartItem(
      {
        where: { id: args.id }
      },
      info
    );
  }
};

module.exports = Mutations;
