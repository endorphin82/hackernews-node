function info(){
  return `This is the API of a Hackernews Clone`
}
function feed(parent, args, context, info) {
  return context.prisma.links()
}

module.exports = {
  info,
  feed,
}