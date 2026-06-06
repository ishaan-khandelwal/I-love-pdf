import pdfRoutes from '../server/routes/pdfRoutes.js'

const routes = pdfRoutes.stack.filter((layer) => layer.route).map((layer) => ({
  path: layer.route.path,
  methods: layer.route.methods,
}))
console.log(routes)
