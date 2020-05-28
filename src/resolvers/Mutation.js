const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { APP_SECRET, getUserId } = require('../utils')

async function signup(parent, args, context, info) {
  // 1
  const hashedPassword = await bcrypt.hash(args.password, 10)
  // 2
  const { password, ...user } = await context.prisma.createUser({ ...args, password: hashedPassword })

  // 3
  const token = jwt.sign({ userId: user.id }, APP_SECRET)

  // 4
  return {
    token,
    user
  }
}

async function login(parent, args, context, info) {
  // 1
  const { password, ...user } = await context.prisma.user({ email: args.email })
  if (!user) {
    throw new Error('No such user found')
  }

  // 2
  const valid = await bcrypt.compare(args.password, password)
  if (!valid) {
    throw new Error('Invalid password')
  }

  const token = jwt.sign({ userId: user.id }, APP_SECRET)

  // 3
  return {
    token,
    user
  }
}

function post(parent, args, context, info) {
  const userId = getUserId(context)
  return context.prisma.createLink({
    url: args.url,
    description: args.description,
    postedBy: { connect: { id: userId } }
  })
}

async function vote(parent, args, context, info) {
  // 1 Similar to what you’re doing in the post resolver, the first step is to validate the incoming JWT with the getUserId helper function. If it’s valid, the function will return the userId of the User who is making the request. If the JWT is not valid, the function will throw an exception.
  const userId = getUserId(context)

  // 2 The prisma.$exists.vote(...) function call is new for you. The prisma client instance not only exposes CRUD methods for your models, it also generates one $exists function per model. The $exists function takes a where filter object that allows to specify certain conditions about elements of that type. Only if the condition applies to at least one element in the database, the $exists function returns true. In this case, you’re using it to verify that the requesting User has not yet voted for the Link that’s identified by args.linkId.
  const voteExists = await context.prisma.$exists.vote({
    user: { id: userId },
    link: { id: args.linkId }
  })
  if (voteExists) {
    throw new Error(`Already voted for link: ${args.linkId}`)
  }

  // 3 If exists returns false, the createVote method will be used to create a new Vote that’s connected to the User and the Link.
  return context.prisma.createVote({
    user: { connect: { id: userId } },
    link: { connect: { id: args.linkId } }
  })
}

module.exports = {
  signup,
  login,
  post,
  vote
}