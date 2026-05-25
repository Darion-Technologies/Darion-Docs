import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const defaultSecret = 'darion-local-admin'
const scopes = new Set(['public', 'internal'])
const roleRank = { viewer: 1, commenter: 2, editor: 3, project_owner: 4, admin: 5, super_admin: 6 }
const accessRank = { none: 0, read: 1, comment: 2, edit: 3, owner: 4 }

export function writerApiPlugin() {
  return {
    name: 'darion-private-docs-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        try {
          const url = new URL(request.url || '/', 'http://darion.local')

          if (url.pathname === '/__writer') {
            redirect(response, '/__admin')
            return
          }

          if (url.pathname === '/__admin') {
            sendHtml(response, getAdminHtml())
            return
          }

          if (url.pathname === '/__internal') {
            sendHtml(response, getInternalHtml())
            return
          }

          if (url.pathname.startsWith('/__admin/api/')) {
            await handleAdminApi(server, request, response, url)
            return
          }

          if (url.pathname.startsWith('/__internal/api/')) {
            await handleInternalApi(server, request, response, url)
            return
          }

          next()
        } catch (error) {
          sendJson(response, 500, { error: error.message || 'Private docs service failed.' })
        }
      })
    }
  }
}

async function handleAdminApi(server, request, response, url) {
  await ensurePrivateFiles(server)

  const parts = url.pathname.split('/').filter(Boolean)
  const method = request.method || 'GET'

  if (method === 'POST' && parts[2] === 'session') {
    await handleSession(server, request, response)
    return
  }

  const session = await requireSession(server, request, response)
  if (!session) return

  if (method === 'GET' && parts[2] === 'me') {
    sendJson(response, 200, session)
    return
  }

  if (!hasRole(session, 'editor')) {
    sendJson(response, 403, { error: 'Admin dashboard access requires the editor or admin role.' })
    return
  }

  if (parts[2] === 'documents') {
    await handleDocumentApi(server, request, response, parts, method, session)
    return
  }

  if (parts[2] === 'navigation') {
    await handleNavigationApi(server, request, response, parts, method, session)
    return
  }

  if (parts[2] === 'homepage') {
    await requireRole(response, session, 'admin') && await handleHomepageApi(server, request, response, method)
    return
  }

  if (parts[2] === 'users') {
    await requireRole(response, session, 'admin') && await handleUsersApi(server, request, response, parts, method)
    return
  }

  if (parts[2] === 'projects') {
    await requireRole(response, session, 'admin') && await handleProjectsApi(server, request, response, parts, method)
    return
  }

  if (parts[2] === 'assignments') {
    await requireRole(response, session, 'admin') && await handleAssignmentsApi(server, request, response, parts, method)
    return
  }

  if (parts[2] === 'quality' && method === 'GET') {
    const payload = await getQualityReport(server)
    sendJson(response, 200, payload)
    return
  }

  if (parts[2] === 'build' && method === 'POST') {
    await requireRole(response, session, 'admin') && await handleBuild(server, response)
    return
  }

  sendJson(response, 404, { error: 'Admin endpoint not found.' })
}

async function handleInternalApi(server, request, response, url) {
  await ensurePrivateFiles(server)

  const session = await requireSession(server, request, response)
  if (!session) return

  const parts = url.pathname.split('/').filter(Boolean)
  const method = request.method || 'GET'

  if (method === 'GET' && parts[2] === 'navigation') {
    sendJson(response, 200, await readJson(server, 'metadata/internal-navigation.json', defaultInternalNavigation()))
    return
  }

  if (method === 'GET' && parts[2] === 'documents' && !parts[3]) {
    sendJson(response, 200, { documents: await listAccessibleDocuments(server, session) })
    return
  }

  if (method === 'GET' && parts[2] === 'documents' && parts[3]) {
    const document = await readDocument(server, 'internal', parts[3])
    if (!canAccessDocument(await readAssignments(server), document, session, 'read', await readProjectMembers(server))) {
      sendJson(response, 403, { error: 'This internal document is not assigned to your profile.' })
      return
    }
    sendJson(response, 200, document)
    return
  }

  if (parts[2] === 'comments' && parts[3]) {
    await handleInternalCommentsApi(server, request, response, parts, method, session)
    return
  }

  sendJson(response, 404, { error: 'Internal endpoint not found.' })
}

async function handleSession(server, request, response) {
  const body = await readJsonBody(request)
  const secret = String(body.secret || '').trim()
  const userId = String(body.userId || 'admin').trim()
  const expected = process.env.DARION_ADMIN_SECRET || defaultSecret

  if (!secret || secret !== expected) {
    sendJson(response, 401, { error: 'Invalid admin secret.' })
    return
  }

  const users = await readUsers(server)
  const user = users.find((entry) => entry.id === userId && !entry.disabled)

  if (!user) {
    sendJson(response, 403, { error: 'The selected local user is disabled or missing.' })
    return
  }

  const session = await makeSession(server, user)
  sendJson(response, 200, session)
}

async function handleDocumentApi(server, request, response, parts, method, session) {
  if (method === 'GET' && !parts[3]) {
    const documents = [
      ...(await listDocuments(server, 'public')),
      ...(await listDocuments(server, 'internal'))
    ]
    sendJson(response, 200, { documents })
    return
  }

  const scope = parts[3]
  const slug = parts[4]
  const action = parts[5]

  if (!scopes.has(scope)) {
    sendJson(response, 400, { error: 'Scope must be public or internal.' })
    return
  }

  if (method === 'GET' && slug) {
    sendJson(response, 200, await readDocument(server, scope, slug))
    return
  }

  if (method === 'POST' && !slug) {
    if (!hasRole(session, 'editor')) return sendJson(response, 403, { error: 'Editor access is required.' })
    const body = await readJsonBody(request)
    const saved = await saveDocument(server, scope, body)
    server.ws.send({ type: 'full-reload' })
    sendJson(response, 201, saved)
    return
  }

  if (method === 'PUT' && slug) {
    if (!hasRole(session, 'editor')) return sendJson(response, 403, { error: 'Editor access is required.' })
    const body = await readJsonBody(request)
    const saved = await saveDocument(server, scope, { ...body, slug })
    server.ws.send({ type: 'full-reload' })
    sendJson(response, 200, saved)
    return
  }

  if (method === 'DELETE' && slug) {
    if (!hasRole(session, 'editor')) return sendJson(response, 403, { error: 'Editor access is required.' })
    await deleteDocument(server, scope, slug)
    server.ws.send({ type: 'full-reload' })
    sendJson(response, 200, { message: 'Document deleted.' })
    return
  }

  if (method === 'POST' && slug && action === 'archive') {
    if (!hasRole(session, 'editor')) return sendJson(response, 403, { error: 'Editor access is required.' })
    await archiveDocument(server, scope, slug, session.user.id)
    server.ws.send({ type: 'full-reload' })
    sendJson(response, 200, { message: 'Document archived.' })
    return
  }

  if (method === 'POST' && slug && action === 'restore') {
    if (!hasRole(session, 'editor')) return sendJson(response, 403, { error: 'Editor access is required.' })
    await restoreDocument(server, scope, slug)
    server.ws.send({ type: 'full-reload' })
    sendJson(response, 200, { message: 'Document restored.' })
    return
  }

  if (method === 'POST' && slug && action === 'duplicate') {
    if (!hasRole(session, 'editor')) return sendJson(response, 403, { error: 'Editor access is required.' })
    const duplicated = await duplicateDocument(server, scope, slug)
    server.ws.send({ type: 'full-reload' })
    sendJson(response, 201, duplicated)
    return
  }

  sendJson(response, 404, { error: 'Document endpoint not found.' })
}

async function handleNavigationApi(server, request, response, parts, method, session) {
  const target = parts[3]
  const files = {
    public: 'metadata/navigation.json',
    internal: 'metadata/internal-navigation.json'
  }

  if (!files[target]) {
    sendJson(response, 400, { error: 'Navigation target must be public or internal.' })
    return
  }

  if (method === 'GET') {
    const fallback = target === 'public' ? defaultPublicNavigation() : defaultInternalNavigation()
    sendJson(response, 200, await readJson(server, files[target], fallback))
    return
  }

  if (method === 'PUT') {
    if (!hasRole(session, 'admin')) return sendJson(response, 403, { error: 'Admin access is required.' })
    const body = await readJsonBody(request)
    await writeJson(server, files[target], body)
    sendJson(response, 200, body)
    return
  }

  sendJson(response, 405, { error: 'Unsupported navigation method.' })
}

async function handleHomepageApi(server, request, response, method) {
  if (method === 'GET') {
    sendJson(response, 200, await readJson(server, 'metadata/homepage.json', defaultHomepage()))
    return
  }

  if (method === 'PUT') {
    const body = await readJsonBody(request)
    await writeJson(server, 'metadata/homepage.json', body)
    sendJson(response, 200, body)
    return
  }

  sendJson(response, 405, { error: 'Unsupported homepage method.' })
}

async function handleUsersApi(server, request, response, parts, method) {
  if (method === 'GET') {
    sendJson(response, 200, { users: await readUsers(server), roles: await readRoles(server) })
    return
  }

  const users = await readUsers(server)
  const userId = parts[3]

  if (method === 'POST') {
    const body = await readJsonBody(request)
    const user = normalizeUser(body)
    if (users.some((entry) => entry.id === user.id)) {
      sendJson(response, 409, { error: 'User already exists.' })
      return
    }
    users.push(user)
    await writeJson(server, 'metadata/users.json', { users })
    sendJson(response, 201, user)
    return
  }

  if (method === 'PUT' && userId) {
    const body = await readJsonBody(request)
    const index = users.findIndex((entry) => entry.id === userId)
    if (index === -1) return sendJson(response, 404, { error: 'User not found.' })
    users[index] = normalizeUser({ ...users[index], ...body, id: userId })
    await writeJson(server, 'metadata/users.json', { users })
    sendJson(response, 200, users[index])
    return
  }

  if (method === 'DELETE' && userId) {
    const nextUsers = users.filter((entry) => entry.id !== userId)
    await writeJson(server, 'metadata/users.json', { users: nextUsers })
    sendJson(response, 200, { message: 'User deleted.' })
    return
  }

  sendJson(response, 405, { error: 'Unsupported users method.' })
}

async function handleProjectsApi(server, request, response, parts, method) {
  if (method === 'GET') {
    sendJson(response, 200, { projects: await readProjects(server) })
    return
  }

  const projects = await readProjects(server)
  const projectId = parts[3]

  if (method === 'POST') {
    const body = await readJsonBody(request)
    const project = normalizeProject(body)
    if (projects.some((entry) => entry.id === project.id)) {
      sendJson(response, 409, { error: 'Project already exists.' })
      return
    }
    projects.push(project)
    await writeJson(server, 'metadata/projects.json', { projects })
    sendJson(response, 201, project)
    return
  }

  if (method === 'PUT' && projectId) {
    const body = await readJsonBody(request)
    const index = projects.findIndex((entry) => entry.id === projectId)
    if (index === -1) return sendJson(response, 404, { error: 'Project not found.' })
    projects[index] = normalizeProject({ ...projects[index], ...body, id: projectId })
    await writeJson(server, 'metadata/projects.json', { projects })
    sendJson(response, 200, projects[index])
    return
  }

  if (method === 'DELETE' && projectId) {
    await writeJson(server, 'metadata/projects.json', { projects: projects.filter((entry) => entry.id !== projectId) })
    sendJson(response, 200, { message: 'Project deleted.' })
    return
  }

  sendJson(response, 405, { error: 'Unsupported projects method.' })
}

async function handleAssignmentsApi(server, request, response, parts, method) {
  if (method === 'GET') {
    sendJson(response, 200, { assignments: await readAssignments(server), projects: await readProjects(server) })
    return
  }

  const assignments = await readAssignments(server)
  const assignmentId = parts[3]

  if (method === 'POST') {
    const body = await readJsonBody(request)
    const assignment = normalizeAssignment(body)
    assignments.push(assignment)
    await writeJson(server, 'metadata/doc-assignments.json', { assignments })
    sendJson(response, 201, assignment)
    return
  }

  if (method === 'PUT' && assignmentId) {
    const body = await readJsonBody(request)
    const index = assignments.findIndex((entry) => entry.id === assignmentId)
    if (index === -1) return sendJson(response, 404, { error: 'Assignment not found.' })
    assignments[index] = normalizeAssignment({ ...assignments[index], ...body, id: assignmentId })
    await writeJson(server, 'metadata/doc-assignments.json', { assignments })
    sendJson(response, 200, assignments[index])
    return
  }

  if (method === 'DELETE' && assignmentId) {
    await writeJson(server, 'metadata/doc-assignments.json', { assignments: assignments.filter((entry) => entry.id !== assignmentId) })
    sendJson(response, 200, { message: 'Assignment deleted.' })
    return
  }

  sendJson(response, 405, { error: 'Unsupported assignments method.' })
}

async function handleInternalCommentsApi(server, request, response, parts, method, session) {
  const slug = normalizeSlug(parts[3])
  const document = await readDocument(server, 'internal', slug)
  const assignments = await readAssignments(server)
  const projectMembers = await readProjectMembers(server)
  if (!canAccessDocument(assignments, document, session, 'read', projectMembers)) {
    sendJson(response, 403, { error: 'This internal document is not assigned to your profile.' })
    return
  }

  const comments = await readComments(server)

  if (method === 'GET') {
    sendJson(response, 200, { comments: comments.filter((entry) => entry.slug === slug) })
    return
  }

  if (method === 'POST') {
    if (!canAccessDocument(assignments, document, session, 'comment', projectMembers)) {
      sendJson(response, 403, { error: 'Comment access is required for this document.' })
      return
    }
    const body = await readJsonBody(request)
    const comment = {
      id: `comment-${Date.now()}`,
      slug,
      author: session.user.id,
      authorName: session.user.name,
      body: String(body.body || '').trim(),
      resolved: false,
      createdAt: new Date().toISOString()
    }
    if (!comment.body) {
      sendJson(response, 400, { error: 'Comment body is required.' })
      return
    }
    comments.push(comment)
    await writeJson(server, 'metadata/doc-comments.json', { comments })
    sendJson(response, 201, comment)
    return
  }

  sendJson(response, 405, { error: 'Unsupported comments method.' })
}

async function handleBuild(server, response) {
  try {
    const result = await execFileAsync('npm', ['run', 'docs:build'], {
      cwd: getRoot(server),
      timeout: 120000,
      maxBuffer: 1024 * 1024
    })
    sendJson(response, 200, {
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr
    })
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message
    })
  }
}

async function ensurePrivateFiles(server) {
  const root = getRoot(server)
  await fs.mkdir(path.join(root, 'metadata'), { recursive: true })
  await fs.mkdir(path.join(root, 'metadata/archive-files'), { recursive: true })
  await fs.mkdir(path.join(root, 'internal'), { recursive: true })

  await ensureJson(server, 'metadata/navigation.json', defaultPublicNavigation())
  await ensureJson(server, 'metadata/homepage.json', defaultHomepage())
  await ensureJson(server, 'metadata/settings.json', defaultSettings())
  await ensureJson(server, 'metadata/archive.json', { documents: [] })
  await ensureJson(server, 'metadata/internal-navigation.json', defaultInternalNavigation())
  await ensureJson(server, 'metadata/users.json', defaultUsers())
  await ensureJson(server, 'metadata/roles.json', defaultRoles())
  await ensureJson(server, 'metadata/projects.json', defaultProjects())
  await ensureJson(server, 'metadata/project-members.json', defaultProjectMembers())
  await ensureJson(server, 'metadata/doc-assignments.json', defaultAssignments())
  await ensureJson(server, 'metadata/doc-comments.json', { comments: [] })

  const handbook = path.join(root, 'internal/engineering-handbook.md')
  if (!(await exists(handbook))) {
    await fs.writeFile(handbook, defaultInternalDocument(), 'utf8')
  }
}

async function listDocuments(server, scope) {
  const directory = getScopeDir(server, scope)
  await fs.mkdir(directory, { recursive: true })
  const files = await fs.readdir(directory)
  const documents = []
  const projects = scope === 'internal' ? await readProjects(server) : []
  const assignments = scope === 'internal' ? await readAssignments(server) : []

  for (const file of files.filter((entry) => entry.endsWith('.md')).sort()) {
    const slug = file.replace(/\.md$/, '')
    const markdown = await fs.readFile(path.join(directory, file), 'utf8')
    const frontmatter = readFrontmatter(markdown)
    const project = frontmatter.project || assignments.find((entry) => entry.slug === slug)?.project || (scope === 'internal' ? 'company-systems' : '')
    const projectDetail = projects.find((entry) => entry.id === project)
    documents.push({
      scope,
      slug,
      title: frontmatter.title || readTitle(markdown) || titleFromSlug(slug),
      group: frontmatter.group || (scope === 'public' ? 'Core Modules' : 'Internal'),
      project,
      projectName: projectDetail?.name || titleFromSlug(project),
      category: frontmatter.category || frontmatter.group || (scope === 'public' ? 'Core Modules' : 'general'),
      order: Number(frontmatter.order || 1000),
      status: frontmatter.status || 'published',
      owner: frontmatter.owner || 'docs',
      tags: parseCsv(frontmatter.tags),
      visibility: frontmatter.visibility || scope,
      path: scope === 'public' ? `docs/${slug}.md` : `internal/${slug}.md`,
      route: scope === 'public' ? `/docs/${slug}` : `/__internal?doc=${slug}`
    })
  }

  return documents.sort((a, b) => a.scope.localeCompare(b.scope) || a.order - b.order || a.title.localeCompare(b.title))
}

async function readDocument(server, scope, slug) {
  const normalizedSlug = normalizeSlug(slug)
  const filePath = getDocumentPath(server, scope, normalizedSlug)
  const markdown = await fs.readFile(filePath, 'utf8')
  const frontmatter = readFrontmatter(markdown)

  return {
    scope,
    slug: normalizedSlug,
    title: frontmatter.title || readTitle(markdown) || titleFromSlug(normalizedSlug),
    group: frontmatter.group || (scope === 'public' ? 'Core Modules' : 'Internal'),
    project: frontmatter.project || (scope === 'internal' ? 'company-systems' : ''),
    category: frontmatter.category || frontmatter.group || (scope === 'public' ? 'Core Modules' : 'general'),
    order: Number(frontmatter.order || 1000),
    status: frontmatter.status || 'published',
    owner: frontmatter.owner || 'docs',
    tags: parseCsv(frontmatter.tags),
    visibility: frontmatter.visibility || scope,
    markdown
  }
}

async function saveDocument(server, scope, body) {
  const title = String(body.title || '').trim()
  const slug = normalizeSlug(body.slug || title)

  if (!title) throw new Error('A title is required.')
  if (!slug) throw new Error('A slug is required.')

  const markdown = String(body.markdown || '').trim()
  if (!markdown) throw new Error('Markdown content is required.')

  const metadata = {
    title,
    group: body.group || (scope === 'public' ? 'Core Modules' : 'Internal'),
    project: body.project || (scope === 'internal' ? 'company-systems' : ''),
    category: body.category || body.group || (scope === 'public' ? 'Core Modules' : 'general'),
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 1000,
    status: body.status || 'draft',
    owner: body.owner || 'docs',
    tags: Array.isArray(body.tags) ? body.tags.join(', ') : body.tags || '',
    visibility: body.visibility || scope
  }

  const content = ensureFrontmatter(markdown, metadata)
  const filePath = getDocumentPath(server, scope, slug)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${content}\n`, 'utf8')

  return {
    scope,
    slug,
    title,
    path: scope === 'public' ? `docs/${slug}.md` : `internal/${slug}.md`
  }
}

async function deleteDocument(server, scope, slug) {
  const normalizedSlug = normalizeSlug(slug)
  await fs.unlink(getDocumentPath(server, scope, normalizedSlug))
}

async function archiveDocument(server, scope, slug, actor) {
  const normalizedSlug = normalizeSlug(slug)
  const source = getDocumentPath(server, scope, normalizedSlug)
  const archiveFile = getArchivePath(server, scope, normalizedSlug)
  const archive = await readJson(server, 'metadata/archive.json', { documents: [] })
  await fs.mkdir(path.dirname(archiveFile), { recursive: true })
  await fs.copyFile(source, archiveFile)
  await fs.unlink(source)

  archive.documents = archive.documents.filter((entry) => !(entry.scope === scope && entry.slug === normalizedSlug))
  archive.documents.push({
    scope,
    slug: normalizedSlug,
    file: path.relative(getRoot(server), archiveFile),
    archivedAt: new Date().toISOString(),
    archivedBy: actor
  })
  await writeJson(server, 'metadata/archive.json', archive)
}

async function restoreDocument(server, scope, slug) {
  const normalizedSlug = normalizeSlug(slug)
  const archive = await readJson(server, 'metadata/archive.json', { documents: [] })
  const entry = archive.documents.find((item) => item.scope === scope && item.slug === normalizedSlug)
  if (!entry) throw new Error('Archived document not found.')

  const source = path.join(getRoot(server), entry.file)
  const target = getDocumentPath(server, scope, normalizedSlug)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.copyFile(source, target)
  await fs.unlink(source)
  archive.documents = archive.documents.filter((item) => item !== entry)
  await writeJson(server, 'metadata/archive.json', archive)
}

async function duplicateDocument(server, scope, slug) {
  const source = await readDocument(server, scope, slug)
  let copySlug = `${source.slug}-copy`
  let index = 2

  while (await exists(getDocumentPath(server, scope, copySlug))) {
    copySlug = `${source.slug}-copy-${index}`
    index += 1
  }

  const markdown = source.markdown.replace(/^title:\s*.*$/m, `title: ${yamlValue(`${source.title} Copy`)}`)
  return saveDocument(server, scope, {
    ...source,
    slug: copySlug,
    title: `${source.title} Copy`,
    markdown
  })
}

async function getQualityReport(server) {
  const documents = [
    ...(await listDocuments(server, 'public')),
    ...(await listDocuments(server, 'internal'))
  ]
  const issues = []
  const seen = new Set()

  for (const document of documents) {
    const detail = await readDocument(server, document.scope, document.slug)
    const id = `${document.scope}:${document.slug}`

    if (seen.has(document.slug)) {
      issues.push({ severity: 'warning', document: id, message: 'Slug appears in more than one scope.' })
    }
    seen.add(document.slug)

    if (!detail.title) issues.push({ severity: 'error', document: id, message: 'Missing title.' })
    if (!detail.group) issues.push({ severity: 'warning', document: id, message: 'Missing group.' })

    const fenceCount = (detail.markdown.match(/```/g) || []).length
    if (fenceCount % 2 !== 0) {
      issues.push({ severity: 'error', document: id, message: 'Unclosed fenced code block.' })
    }

    const broken = await findBrokenLinks(server, detail.markdown, document.scope)
    for (const link of broken) {
      issues.push({ severity: 'error', document: id, message: `Broken local link: ${link}` })
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    counts: {
      documents: documents.length,
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length
    },
    issues
  }
}

async function findBrokenLinks(server, markdown, scope) {
  const matches = [...markdown.matchAll(/\[[^\]]+\]\((?!https?:|mailto:|#)([^)]+)\)/g)]
  const broken = []

  for (const match of matches) {
    const link = match[1].split('#')[0]
    if (!link) continue

    const slug = normalizeSlug(path.basename(link).replace(/\.md$/, ''))
    const targetScope = link.startsWith('/__internal') ? 'internal' : scope
    if (!(await exists(getDocumentPath(server, targetScope, slug)))) broken.push(match[1])
  }

  return broken
}

async function requireSession(server, request, response) {
  const token = readAuthToken(request)
  const secret = request.headers['x-admin-secret']
  const expected = process.env.DARION_ADMIN_SECRET || defaultSecret
  let userId = request.headers['x-admin-user'] || 'admin'

  if (token) {
    const decoded = decodeToken(token)
    if (!decoded || decoded.secret !== expected) {
      sendJson(response, 401, { error: 'Invalid session token.' })
      return null
    }
    userId = decoded.userId
  } else if (secret !== expected) {
    sendJson(response, 401, { error: 'Admin session required.' })
    return null
  }

  const users = await readUsers(server)
  const user = users.find((entry) => entry.id === userId && !entry.disabled)
  if (!user) {
    sendJson(response, 403, { error: 'User is disabled or missing.' })
    return null
  }

  return makeSession(server, user)
}

async function makeSession(server, user) {
  const roles = await readRoles(server)
  const role = roles.find((entry) => entry.id === user.role) || roles[0]
  const token = encodeToken({
    userId: user.id,
    secret: process.env.DARION_ADMIN_SECRET || defaultSecret
  })

  return {
    token,
    user,
    role
  }
}

function requireRole(response, session, role) {
  if (!hasRole(session, role)) {
    sendJson(response, 403, { error: `${titleFromSlug(role)} access is required.` })
    return false
  }

  return true
}

function hasRole(session, required) {
  return (roleRank[session.user.role] || 0) >= (roleRank[required] || 0)
}

async function readUsers(server) {
  const payload = await readJson(server, 'metadata/users.json', defaultUsers())
  return Array.isArray(payload.users) ? payload.users.map(normalizeUser) : []
}

async function readRoles(server) {
  const payload = await readJson(server, 'metadata/roles.json', defaultRoles())
  return Array.isArray(payload.roles) ? payload.roles : defaultRoles().roles
}

async function readProjects(server) {
  const payload = await readJson(server, 'metadata/projects.json', defaultProjects())
  return Array.isArray(payload.projects) ? payload.projects.map(normalizeProject) : []
}

async function readAssignments(server) {
  const payload = await readJson(server, 'metadata/doc-assignments.json', defaultAssignments())
  return Array.isArray(payload.assignments) ? payload.assignments.map(normalizeAssignment) : []
}

async function readProjectMembers(server) {
  const payload = await readJson(server, 'metadata/project-members.json', defaultProjectMembers())
  return Array.isArray(payload.members) ? payload.members.map(normalizeProjectMember) : []
}

async function readComments(server) {
  const payload = await readJson(server, 'metadata/doc-comments.json', { comments: [] })
  return Array.isArray(payload.comments) ? payload.comments : []
}

async function listAccessibleDocuments(server, session) {
  const documents = await listDocuments(server, 'internal')
  const assignments = await readAssignments(server)
  const projectMembers = await readProjectMembers(server)
  return documents
    .filter((document) => canAccessDocument(assignments, document, session, 'read', projectMembers))
    .map((document) => ({
      ...document,
      accessLevel: getDocumentAccessLevel(assignments, document, session, projectMembers)
    }))
}

function canAccessDocument(assignments, document, session, minimumAccess, projectMembers = []) {
  return accessRank[getDocumentAccessLevel(assignments, document, session, projectMembers)] >= accessRank[minimumAccess]
}

function getDocumentAccessLevel(assignments, document, session, projectMembers = []) {
  if (hasRole(session, 'admin')) return 'owner'

  const matches = assignments.filter((assignment) => {
    if (assignment.scope !== document.scope || assignment.slug !== document.slug) return false
    if (assignment.targetType === 'user') return assignment.target === session.user.id
    if (assignment.targetType === 'role') return (roleRank[session.user.role] || 0) >= (roleRank[assignment.target] || 0)
    if (assignment.targetType === 'project') {
      return assignment.target === document.project && projectMembers.some((member) => member.project === assignment.target && member.user === session.user.id)
    }
    return false
  })

  return matches.reduce((best, assignment) => {
    return accessRank[assignment.accessLevel] > accessRank[best] ? assignment.accessLevel : best
  }, 'none')
}

function normalizeUser(input) {
  const role = Object.prototype.hasOwnProperty.call(roleRank, input.role) ? input.role : 'viewer'
  return {
    id: normalizeSlug(input.id || input.name || role),
    name: String(input.name || titleFromSlug(input.id || role)).trim(),
    role,
    disabled: Boolean(input.disabled)
  }
}

function normalizeProject(input) {
  const id = normalizeSlug(input.id || input.name || 'project')
  return {
    id,
    name: String(input.name || titleFromSlug(id)).trim(),
    description: String(input.description || '').trim(),
    status: String(input.status || 'active').trim(),
    owner: normalizeSlug(input.owner || 'admin')
  }
}

function normalizeAssignment(input) {
  const slug = normalizeSlug(input.slug || '')
  const targetType = ['user', 'project', 'role'].includes(input.targetType) ? input.targetType : 'role'
  const accessLevel = Object.prototype.hasOwnProperty.call(accessRank, input.accessLevel) ? input.accessLevel : 'read'
  const target = targetType === 'role' ? String(input.target || 'viewer') : normalizeSlug(input.target || '')
  return {
    id: normalizeSlug(input.id || `${slug}-${targetType}-${target}-${accessLevel}`),
    scope: scopes.has(input.scope) ? input.scope : 'internal',
    slug,
    project: normalizeSlug(input.project || 'company-systems'),
    targetType,
    target,
    accessLevel,
    assignedBy: normalizeSlug(input.assignedBy || 'admin')
  }
}

function normalizeProjectMember(input) {
  return {
    project: normalizeSlug(input.project || ''),
    user: normalizeSlug(input.user || ''),
    role: Object.prototype.hasOwnProperty.call(roleRank, input.role) ? input.role : 'viewer'
  }
}

function readAuthToken(request) {
  const authorization = request.headers.authorization || ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
}

function encodeToken(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

function decodeToken(token) {
  try {
    return JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

function readFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---/)
  const frontmatter = {}
  if (!match) return frontmatter

  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':')
    if (separator === -1) continue
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, '')
    frontmatter[key] = value
  }

  return frontmatter
}

function ensureFrontmatter(markdown, metadata) {
  const clean = markdown.replace(/^---\n[\s\S]*?\n---\n?/, '').trim()
  const frontmatter = [
    '---',
    `title: ${yamlValue(metadata.title)}`,
    `group: ${yamlValue(metadata.group)}`,
    `order: ${Number(metadata.order)}`,
    `status: ${yamlValue(metadata.status)}`,
    `owner: ${yamlValue(metadata.owner)}`,
    `tags: ${yamlValue(metadata.tags)}`,
    `visibility: ${yamlValue(metadata.visibility)}`,
    `project: ${yamlValue(metadata.project)}`,
    `category: ${yamlValue(metadata.category)}`,
    '---',
    ''
  ].join('\n')

  return `${frontmatter}${clean}`
}

function yamlValue(value) {
  return JSON.stringify(String(value || ''))
}

function readTitle(source) {
  return source.match(/^#\s+(.+)$/m)?.[1]?.trim()
}

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getRoot(server) {
  return server.config.root
}

function getScopeDir(server, scope) {
  return path.join(getRoot(server), scope === 'public' ? 'docs' : 'internal')
}

function getDocumentPath(server, scope, slug) {
  if (!scopes.has(scope)) throw new Error('Scope must be public or internal.')
  const normalizedSlug = normalizeSlug(slug)
  if (!normalizedSlug) throw new Error('Document slug is required.')
  return path.join(getScopeDir(server, scope), `${normalizedSlug}.md`)
}

function getArchivePath(server, scope, slug) {
  return path.join(getRoot(server), 'metadata/archive-files', `${scope}-${normalizeSlug(slug)}.md`)
}

async function readJson(server, relativePath, fallback) {
  try {
    const payload = await fs.readFile(path.join(getRoot(server), relativePath), 'utf8')
    return JSON.parse(payload)
  } catch {
    return structuredClone(fallback)
  }
}

async function writeJson(server, relativePath, value) {
  const filePath = path.join(getRoot(server), relativePath)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function ensureJson(server, relativePath, fallback) {
  const filePath = path.join(getRoot(server), relativePath)
  if (!(await exists(filePath))) await writeJson(server, relativePath, fallback)
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readJsonBody(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  if (!chunks.length) return {}

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new Error('Request body must be valid JSON.')
  }
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

function sendHtml(response, html) {
  response.statusCode = 200
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.end(html)
}

function redirect(response, location) {
  response.statusCode = 302
  response.setHeader('Location', location)
  response.end()
}

function defaultPublicNavigation() {
  return {
    groups: [
      {
        title: 'Fundamentals',
        items: [
          { title: 'Introduction', slug: 'introduction', order: 10 },
          { title: 'Architecture', slug: 'architecture', order: 20 }
        ]
      },
      {
        title: 'Core Modules',
        items: [
          { title: 'Getting Started', slug: 'getting-started', order: 10 },
          { title: 'Authentication', slug: 'authentication', order: 20 },
          { title: 'API Specifications', slug: 'api-specifications', order: 30 }
        ]
      }
    ]
  }
}

function defaultInternalNavigation() {
  return {
    groups: [
      {
        title: 'Company Systems',
        items: [
          { title: 'Engineering Handbook', slug: 'engineering-handbook', order: 10 }
        ]
      }
    ]
  }
}

function defaultHomepage() {
  return {
    eyebrow: 'Darion Technologies',
    title: 'Developer Documentation',
    subtitle: 'Browse technical references, architectural guidance, and implementation notes for Darion systems.',
    cards: [
      { title: 'Fundamentals', href: '/docs/introduction', description: 'Start with the concepts and documentation model.' },
      { title: 'Architecture', href: '/docs/architecture', description: 'Explore system boundaries and runtime responsibilities.' },
      { title: 'Guides', href: '/docs/getting-started', description: 'Follow task-oriented workflows for implementation.' },
      { title: 'API Reference', href: '/docs/api-specifications', description: 'Review schemas, envelopes, and compatibility rules.' }
    ]
  }
}

function defaultSettings() {
  return {
    siteTitle: 'Darion Docs',
    publicDocsPath: 'docs',
    internalDocsPath: 'internal',
    adminRoute: '/__admin',
    internalRoute: '/__internal',
    buildCommand: 'npm run docs:build'
  }
}

function defaultUsers() {
  return {
    users: [
      { id: 'admin', name: 'Admin', role: 'admin', disabled: false },
      { id: 'editor', name: 'Editor', role: 'editor', disabled: false },
      { id: 'viewer', name: 'Viewer', role: 'viewer', disabled: false }
    ]
  }
}

function defaultRoles() {
  return {
    roles: [
      {
        id: 'super_admin',
        name: 'Super Admin',
        permissions: ['*']
      },
      {
        id: 'admin',
        name: 'Admin',
        permissions: ['admin:*', 'documents:*', 'internal:*', 'users:*', 'settings:*', 'publish:*']
      },
      {
        id: 'project_owner',
        name: 'Project Owner',
        permissions: ['documents:read', 'documents:write', 'documents:assign', 'internal:read', 'internal:write']
      },
      {
        id: 'editor',
        name: 'Editor',
        permissions: ['documents:read', 'documents:write', 'internal:read', 'internal:write']
      },
      {
        id: 'commenter',
        name: 'Commenter',
        permissions: ['internal:read', 'internal:comment']
      },
      {
        id: 'viewer',
        name: 'Viewer',
        permissions: ['internal:read']
      }
    ]
  }
}

function defaultProjects() {
  return {
    projects: [
      {
        id: 'darion-bpo-platform',
        name: 'Darion BPO Platform',
        description: 'Execution, setup, handling, and troubleshooting documentation for the Darion BPO Platform.',
        status: 'active',
        owner: 'admin'
      },
      {
        id: 'company-systems',
        name: 'Company Systems',
        description: 'Shared internal operating references for Darion engineering teams.',
        status: 'active',
        owner: 'admin'
      }
    ]
  }
}

function defaultProjectMembers() {
  return {
    members: [
      { project: 'company-systems', user: 'viewer', role: 'viewer' },
      { project: 'darion-bpo-platform', user: 'editor', role: 'editor' },
      { project: 'darion-bpo-platform', user: 'admin', role: 'admin' }
    ]
  }
}

function defaultAssignments() {
  return {
    assignments: [
      {
        id: 'engineering-handbook-viewers',
        scope: 'internal',
        slug: 'engineering-handbook',
        project: 'company-systems',
        targetType: 'role',
        target: 'viewer',
        accessLevel: 'read',
        assignedBy: 'admin'
      },
      {
        id: 'm1-planning-editors',
        scope: 'internal',
        slug: 'm1-20planning',
        project: 'darion-bpo-platform',
        targetType: 'role',
        target: 'editor',
        accessLevel: 'edit',
        assignedBy: 'admin'
      },
      {
        id: 'm1-planning-admins',
        scope: 'internal',
        slug: 'm1-20planning',
        project: 'darion-bpo-platform',
        targetType: 'role',
        target: 'admin',
        accessLevel: 'owner',
        assignedBy: 'admin'
      }
    ]
  }
}

function defaultInternalDocument() {
  return `---
title: "Engineering Handbook"
group: "Company Systems"
order: 10
status: "published"
owner: "platform"
tags: "internal, engineering"
visibility: "internal"
---

# Engineering Handbook

This private page is the starting point for internal Darion engineering documentation.

## Operating Model

Use internal documents for access-controlled procedures, incident references, service ownership, and company-only technical context.

## Access

Readers with the viewer, editor, or admin role can open this portal. Editors and admins can manage the source Markdown from the admin dashboard.
`
}

function getAdminHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Darion Admin</title>
${getPrivateCss()}
</head>
<body>
<div class="shell">
  <header class="topbar">
    <a class="brand" href="/">Darion Docs</a>
    <nav class="topnav" aria-label="Private portals">
      <a href="/__admin">Admin</a>
      <a href="/__internal">Internal</a>
      <a href="/">Public</a>
    </nav>
  </header>
  <main id="app" class="workspace"></main>
</div>
<script>
(function () {
  var state = { token: localStorage.getItem('darionAdminToken') || '', user: null, tab: 'overview', docs: [], selected: null };
  var sections = ['overview','public-documents','internal-documents','projects-access','navigation','homepage','users-roles','quality','publishing','settings'];
  var labels = {
    overview: 'Overview',
    'public-documents': 'Public Documents',
    'internal-documents': 'Internal Documents',
    'projects-access': 'Projects & Access',
    navigation: 'Navigation',
    homepage: 'Homepage',
    'users-roles': 'Users & Roles',
    quality: 'Quality',
    publishing: 'Publishing',
    settings: 'Settings'
  };

  function api(path, options) {
    options = options || {};
    options.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (state.token) options.headers.Authorization = 'Bearer ' + state.token;
    return fetch(path, options).then(function (response) {
      return response.json().then(function (payload) {
        if (!response.ok) throw new Error(payload.error || 'Request failed.');
        return payload;
      });
    });
  }

  function renderLogin(message) {
    document.getElementById('app').innerHTML =
      '<section class="login-card">' +
      '<p class="eyebrow">Private Administration</p>' +
      '<h1>Darion Admin</h1>' +
      '<p>Use the local admin secret and a role profile to manage documentation safely in development.</p>' +
      (message ? '<p class="notice">' + escapeHtml(message) + '</p>' : '') +
      '<label>Secret<input id="secret" type="password" autocomplete="current-password" placeholder="DARION_ADMIN_SECRET"></label>' +
      '<label>Profile<select id="userId"><option value="admin">Admin</option><option value="editor">Editor</option></select></label>' +
      '<button id="login">Continue</button>' +
      '<p class="muted">Default local secret: darion-local-admin</p>' +
      '</section>';
    document.getElementById('login').onclick = function () {
      api('/__admin/api/session', {
        method: 'POST',
        body: JSON.stringify({ secret: document.getElementById('secret').value, userId: document.getElementById('userId').value })
      }).then(function (session) {
        state.token = session.token;
        state.user = session.user;
        localStorage.setItem('darionAdminToken', state.token);
        load();
      }).catch(function (error) { renderLogin(error.message); });
    };
  }

  function layout(content) {
    document.getElementById('app').innerHTML =
      '<aside class="rail"><p class="eyebrow">Admin Console</p>' +
      sections.map(function (item) {
        return '<button class="' + (state.tab === item ? 'active' : '') + '" data-tab="' + item + '">' + labels[item] + '</button>';
      }).join('') +
      '<button data-logout="1">Sign Out</button></aside>' +
      '<section class="panel">' + content + '</section>';
    Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'), function (button) {
      button.onclick = function () { state.tab = button.dataset.tab; render(); };
    });
    document.querySelector('[data-logout]').onclick = function () {
      localStorage.removeItem('darionAdminToken');
      state.token = '';
      renderLogin();
    };
  }

  function load() {
    api('/__admin/api/me').then(function (session) {
      state.user = session.user;
      return api('/__admin/api/documents');
    }).then(function (payload) {
      state.docs = payload.documents;
      render();
    }).catch(function () { renderLogin(); });
  }

  function render() {
    if (!state.token) return renderLogin();
    if (state.tab === 'overview') return renderOverview();
    if (state.tab === 'public-documents') return renderDocuments('public');
    if (state.tab === 'internal-documents') return renderDocuments('internal');
    if (state.tab === 'projects-access') return renderProjectsAccess();
    if (state.tab === 'navigation') return renderJsonTool('Navigation', ['/__admin/api/navigation/public','/__admin/api/navigation/internal']);
    if (state.tab === 'homepage') return renderJsonTool('Homepage', ['/__admin/api/homepage']);
    if (state.tab === 'users-roles') return renderUsers();
    if (state.tab === 'quality') return renderQuality();
    if (state.tab === 'publishing') return renderPublishing();
    return renderSettings();
  }

  function renderOverview() {
    var publicCount = state.docs.filter(function (doc) { return doc.scope === 'public'; }).length;
    var internalCount = state.docs.filter(function (doc) { return doc.scope === 'internal'; }).length;
    layout('<div class="panel-head"><p class="eyebrow">Signed in as ' + escapeHtml(state.user.name) + '</p><h1>Documentation Operations</h1><p>Manage public publishing, internal knowledge, navigation, access, and readiness from one private surface.</p></div>' +
      '<div class="metric-grid"><div><strong>' + publicCount + '</strong><span>Public docs</span></div><div><strong>' + internalCount + '</strong><span>Internal docs</span></div><div><strong>' + escapeHtml(state.user.role) + '</strong><span>Current role</span></div></div>' +
      '<div class="callout"><strong>Private routes</strong><span>/__admin and /__internal are served by the dev middleware only and excluded from the public static build.</span></div>');
  }

  function renderDocuments(scope) {
    var docs = state.docs.filter(function (doc) { return doc.scope === scope; });
    layout('<div class="panel-head"><p class="eyebrow">' + scope + '</p><h1>' + (scope === 'public' ? 'Public Documents' : 'Internal Documents') + '</h1><button id="newDoc">New Document</button></div>' +
      '<div class="doc-layout"><div class="list">' + docs.map(function (doc) {
        return '<button data-doc="' + doc.slug + '"><strong>' + escapeHtml(doc.title) + '</strong><span>' + escapeHtml(doc.projectName || doc.group) + ' · ' + escapeHtml(doc.status) + '</span></button>';
      }).join('') + '</div><form class="editor" id="editor"><input name="title" placeholder="Title"><input name="slug" placeholder="slug"><div class="two"><input name="group" placeholder="Group"><input name="order" type="number" placeholder="Order"></div><div class="two"><input name="project" placeholder="Project slug"><input name="category" placeholder="Category"></div><div class="two"><input name="owner" placeholder="Owner"><input name="tags" placeholder="tags, comma separated"></div><select name="status"><option>draft</option><option>review</option><option>published</option><option>archived</option></select><textarea name="markdown" spellcheck="false" placeholder="# New document"></textarea><div class="actions"><button type="submit">Save</button><button type="button" id="duplicate">Duplicate</button><button type="button" id="archive">Archive</button><button type="button" id="delete">Delete</button></div></form></div>');
    document.getElementById('newDoc').onclick = function () { fillEditor({ scope: scope, title: '', slug: '', group: scope === 'public' ? 'Core Modules' : 'Internal', order: 1000, owner: 'docs', tags: [], status: 'draft', markdown: '# New document\\n' }); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-doc]'), function (button) {
      button.onclick = function () {
        api('/__admin/api/documents/' + scope + '/' + button.dataset.doc).then(fillEditor).catch(alertError);
      };
    });
    document.getElementById('editor').onsubmit = function (event) {
      event.preventDefault();
      var payload = editorPayload(scope);
      var method = payload.slug ? 'PUT' : 'POST';
      var url = method === 'PUT' ? '/__admin/api/documents/' + scope + '/' + payload.slug : '/__admin/api/documents/' + scope;
      api(url, { method: method, body: JSON.stringify(payload) }).then(load).catch(alertError);
    };
    document.getElementById('duplicate').onclick = function () { docAction(scope, 'duplicate'); };
    document.getElementById('archive').onclick = function () { docAction(scope, 'archive'); };
    document.getElementById('delete').onclick = function () {
      var slug = document.querySelector('[name=slug]').value;
      if (slug && confirm('Delete ' + slug + '?')) api('/__admin/api/documents/' + scope + '/' + slug, { method: 'DELETE' }).then(load).catch(alertError);
    };
    if (docs[0]) api('/__admin/api/documents/' + scope + '/' + docs[0].slug).then(fillEditor).catch(function () {});
  }

  function fillEditor(doc) {
    var form = document.getElementById('editor');
    if (!form) return;
    form.title.value = doc.title || '';
    form.slug.value = doc.slug || '';
    form.group.value = doc.group || '';
    form.project.value = doc.project || '';
    form.category.value = doc.category || '';
    form.order.value = doc.order || 1000;
    form.owner.value = doc.owner || 'docs';
    form.tags.value = (doc.tags || []).join(', ');
    form.status.value = doc.status || 'draft';
    form.markdown.value = doc.markdown || '# ' + (doc.title || 'New document') + '\\n';
  }

  function editorPayload(scope) {
    var form = document.getElementById('editor');
    return { scope: scope, title: form.title.value, slug: form.slug.value, group: form.group.value, project: form.project.value, category: form.category.value, order: Number(form.order.value || 1000), owner: form.owner.value, tags: form.tags.value, status: form.status.value, markdown: form.markdown.value, visibility: scope };
  }

  function docAction(scope, action) {
    var slug = document.querySelector('[name=slug]').value;
    if (!slug) return;
    api('/__admin/api/documents/' + scope + '/' + slug + '/' + action, { method: 'POST' }).then(load).catch(alertError);
  }

  function renderJsonTool(title, paths) {
    layout('<div class="panel-head"><p class="eyebrow">Structured Metadata</p><h1>' + title + '</h1></div><div class="json-tabs">' + paths.map(function (path) { return '<button data-json="' + path + '">' + path + '</button>'; }).join('') + '</div><textarea class="json-box" id="jsonBox"></textarea><button id="saveJson">Save JSON</button>');
    var active = paths[0];
    function open(path) { active = path; api(path).then(function (payload) { document.getElementById('jsonBox').value = JSON.stringify(payload, null, 2); }).catch(alertError); }
    Array.prototype.forEach.call(document.querySelectorAll('[data-json]'), function (button) { button.onclick = function () { open(button.dataset.json); }; });
    document.getElementById('saveJson').onclick = function () { api(active, { method: 'PUT', body: document.getElementById('jsonBox').value }).then(function () { alert('Saved.'); }).catch(alertError); };
    open(active);
  }

  function renderUsers() {
    layout('<div class="panel-head"><p class="eyebrow">Access Control</p><h1>Users & Roles</h1></div><div id="users"></div><form class="inline-form" id="newUser"><input name="id" placeholder="id"><input name="name" placeholder="Name"><select name="role"><option>admin</option><option>project_owner</option><option>editor</option><option>commenter</option><option>viewer</option></select><button>Add User</button></form>');
    api('/__admin/api/users').then(function (payload) {
      document.getElementById('users').innerHTML = payload.users.map(function (user) {
        return '<div class="row"><strong>' + escapeHtml(user.name) + '</strong><span>' + escapeHtml(user.role) + (user.disabled ? ' · disabled' : '') + '</span><button data-disable="' + user.id + '">' + (user.disabled ? 'Enable' : 'Disable') + '</button><button data-remove="' + user.id + '">Delete</button></div>';
      }).join('');
      Array.prototype.forEach.call(document.querySelectorAll('[data-disable]'), function (button) {
        button.onclick = function () {
          var user = payload.users.find(function (entry) { return entry.id === button.dataset.disable; });
          api('/__admin/api/users/' + user.id, { method: 'PUT', body: JSON.stringify(Object.assign({}, user, { disabled: !user.disabled })) }).then(renderUsers).catch(alertError);
        };
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-remove]'), function (button) {
        button.onclick = function () { api('/__admin/api/users/' + button.dataset.remove, { method: 'DELETE' }).then(renderUsers).catch(alertError); };
      });
    }).catch(alertError);
    document.getElementById('newUser').onsubmit = function (event) {
      event.preventDefault();
      api('/__admin/api/users', { method: 'POST', body: JSON.stringify({ id: this.id.value, name: this.name.value, role: this.role.value }) }).then(renderUsers).catch(alertError);
    };
  }

  function renderProjectsAccess() {
    layout('<div class="panel-head"><p class="eyebrow">Internal RBAC</p><h1>Projects & Access</h1></div><div class="access-grid"><section><h2>Projects</h2><div id="projects"></div><form class="stack-form" id="newProject"><input name="id" placeholder="project-slug"><input name="name" placeholder="Project name"><textarea name="description" placeholder="Project description"></textarea><button>Add Project</button></form></section><section><h2>Assignments</h2><div id="assignments"></div><form class="stack-form" id="newAssignment"><input name="slug" placeholder="internal-doc-slug"><input name="project" placeholder="project-slug"><select name="targetType"><option>role</option><option>user</option><option>project</option></select><input name="target" placeholder="viewer, editor, admin, user id, or project slug"><select name="accessLevel"><option>read</option><option>comment</option><option>edit</option><option>owner</option></select><button>Assign Access</button></form></section></div>');
    Promise.all([api('/__admin/api/projects'), api('/__admin/api/assignments')]).then(function (results) {
      var projects = results[0].projects;
      var assignments = results[1].assignments;
      document.getElementById('projects').innerHTML = projects.map(function (project) {
        return '<div class="row"><strong>' + escapeHtml(project.name) + '</strong><span>' + escapeHtml(project.id + ' · ' + project.status) + '</span><button data-remove-project="' + project.id + '">Delete</button></div>';
      }).join('');
      document.getElementById('assignments').innerHTML = assignments.map(function (assignment) {
        return '<div class="row"><strong>' + escapeHtml(assignment.slug) + '</strong><span>' + escapeHtml(assignment.targetType + ':' + assignment.target + ' · ' + assignment.accessLevel) + '</span><button data-remove-assignment="' + assignment.id + '">Delete</button></div>';
      }).join('');
      Array.prototype.forEach.call(document.querySelectorAll('[data-remove-project]'), function (button) {
        button.onclick = function () { api('/__admin/api/projects/' + button.dataset.removeProject, { method: 'DELETE' }).then(renderProjectsAccess).catch(alertError); };
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-remove-assignment]'), function (button) {
        button.onclick = function () { api('/__admin/api/assignments/' + button.dataset.removeAssignment, { method: 'DELETE' }).then(renderProjectsAccess).catch(alertError); };
      });
    }).catch(alertError);
    document.getElementById('newProject').onsubmit = function (event) {
      event.preventDefault();
      api('/__admin/api/projects', { method: 'POST', body: JSON.stringify({ id: this.id.value, name: this.name.value, description: this.description.value }) }).then(renderProjectsAccess).catch(alertError);
    };
    document.getElementById('newAssignment').onsubmit = function (event) {
      event.preventDefault();
      api('/__admin/api/assignments', { method: 'POST', body: JSON.stringify({ scope: 'internal', slug: this.slug.value, project: this.project.value, targetType: this.targetType.value, target: this.target.value, accessLevel: this.accessLevel.value, assignedBy: state.user.id }) }).then(renderProjectsAccess).catch(alertError);
    };
  }

  function renderQuality() {
    layout('<div class="panel-head"><p class="eyebrow">Readiness</p><h1>Quality</h1><button id="runQuality">Run checks</button></div><div id="quality"></div>');
    document.getElementById('runQuality').onclick = function () {
      api('/__admin/api/quality').then(function (report) {
        document.getElementById('quality').innerHTML = '<div class="metric-grid"><div><strong>' + report.counts.errors + '</strong><span>Errors</span></div><div><strong>' + report.counts.warnings + '</strong><span>Warnings</span></div><div><strong>' + report.counts.documents + '</strong><span>Documents</span></div></div>' +
          report.issues.map(function (issue) { return '<div class="row"><strong>' + issue.severity + '</strong><span>' + escapeHtml(issue.document + ' · ' + issue.message) + '</span></div>'; }).join('');
      }).catch(alertError);
    };
    document.getElementById('runQuality').click();
  }

  function renderPublishing() {
    layout('<div class="panel-head"><p class="eyebrow">Build</p><h1>Publishing</h1><button id="build">Run production build</button></div><pre id="buildOut"></pre>');
    document.getElementById('build').onclick = function () {
      document.getElementById('buildOut').textContent = 'Running npm run docs:build...';
      api('/__admin/api/build', { method: 'POST' }).then(function (payload) {
        document.getElementById('buildOut').textContent = (payload.stdout || '') + '\\n' + (payload.stderr || '');
      }).catch(function (error) { document.getElementById('buildOut').textContent = error.message; });
    };
  }

  function renderSettings() {
    renderJsonTool('Settings', ['/__admin/api/homepage','/__admin/api/navigation/public','/__admin/api/navigation/internal']);
  }

  function alertError(error) { alert(error.message || String(error)); }
  function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]; }); }
  load();
})();
</script>
</body>
</html>`
}

function getInternalHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Darion Internal</title>
${getPrivateCss()}
</head>
<body>
<div class="shell">
  <header class="topbar">
    <a class="brand" href="/">Darion Docs</a>
    <nav class="topnav" aria-label="Private portals">
      <a href="/">Overview</a>
      <a href="/docs/getting-started">Guides</a>
      <a href="/docs/api-specifications">API Reference</a>
    </nav>
  </header>
  <main id="app" class="internal-workspace"></main>
</div>
<script>
(function () {
  var state = { token: localStorage.getItem('darionAdminToken') || '', docs: [], active: null, query: '' };
  function api(path, options) {
    options = options || {};
    options.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (state.token) options.headers.Authorization = 'Bearer ' + state.token;
    return fetch(path, options).then(function (response) {
      return response.json().then(function (payload) {
        if (!response.ok) throw new Error(payload.error || 'Request failed.');
        return payload;
      });
    });
  }
  function renderLogin(message) {
    document.getElementById('app').innerHTML = '<section class="login-card"><p class="eyebrow">My Internals</p><h1>Private Documentation</h1><p>Sign in with the local docs secret and an enabled user profile.</p>' + (message ? '<p class="notice">' + escapeHtml(message) + '</p>' : '') + '<label>Secret<input id="secret" type="password" placeholder="DARION_ADMIN_SECRET"></label><label>Profile<select id="userId"><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option></select></label><button id="login">Continue</button></section>';
    document.getElementById('login').onclick = function () {
      api('/__admin/api/session', { method: 'POST', body: JSON.stringify({ secret: document.getElementById('secret').value, userId: document.getElementById('userId').value }) }).then(function (session) {
        state.token = session.token;
        localStorage.setItem('darionAdminToken', state.token);
        load();
      }).catch(function (error) { renderLogin(error.message); });
    };
  }
  function load() {
    if (!state.token) return renderLogin();
    api('/__internal/api/documents').then(function (payload) {
      state.docs = payload.documents;
      var params = new URLSearchParams(location.search);
      state.active = params.get('doc') || '__home';
      render();
      if (state.active === '__home') renderInternalHome();
      else openDoc(state.active);
    }).catch(function () { renderLogin(); });
  }
  function render() {
    var docs = state.docs.filter(function (doc) {
      return !state.query || (doc.title + ' ' + doc.group).toLowerCase().indexOf(state.query.toLowerCase()) !== -1;
    });
    document.getElementById('app').innerHTML = '<aside class="internal-sidebar"><div class="internal-sidebar-inner"><p class="internal-sidebar-title">My Internals</p><input id="search" class="internal-search" placeholder="Search assigned docs" value="' + escapeHtml(state.query) + '"><button data-home="1" class="' + (state.active === '__home' ? 'active' : '') + '"><span>My Internals</span><small>Assigned home</small></button>' + docs.map(function (doc) { return '<button data-doc="' + doc.slug + '" class="' + (doc.slug === state.active ? 'active' : '') + '"><span>' + escapeHtml(doc.title) + '</span><small>' + escapeHtml((doc.projectName || doc.group) + ' · ' + doc.accessLevel) + '</small></button>'; }).join('') + '</div></aside><article class="internal-doc"><nav class="internal-breadcrumbs" aria-label="Breadcrumb"><span>Internal</span><span>/</span><strong id="crumb">My Internals</strong></nav><div id="document" class="internal-document-body">Select an internal document.</div></article>';
    document.getElementById('search').oninput = function () { state.query = this.value; render(); };
    var homeButton = document.querySelector('[data-home]');
    if (homeButton) homeButton.onclick = function () { renderInternalHome(); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-doc]'), function (button) { button.onclick = function () { openDoc(button.dataset.doc); }; });
  }
  function renderInternalHome() {
    state.active = '__home';
    render();
    document.getElementById('crumb').textContent = 'My Internals';
    document.getElementById('document').innerHTML = getInternalHomeMarkup();
    history.replaceState(null, '', '/__internal');
  }
  function openDoc(slug) {
    state.active = slug;
    render();
    api('/__internal/api/documents/' + slug).then(function (doc) {
      document.getElementById('crumb').textContent = doc.title;
      document.getElementById('document').innerHTML = renderMarkdown(doc.markdown) + '<section class="internal-responses"><h2>Responses</h2><div id="comments">Loading responses...</div><form id="commentForm" class="response-form"><textarea name="body" placeholder="Add a response for this document"></textarea><button>Send Response</button></form></section>';
      loadComments(slug);
      history.replaceState(null, '', '/__internal?doc=' + encodeURIComponent(slug));
    }).catch(alertError);
  }
  function loadComments(slug) {
    api('/__internal/api/comments/' + slug).then(function (payload) {
      var comments = payload.comments || [];
      document.getElementById('comments').innerHTML = comments.length ? comments.map(function (comment) {
        return '<article class="response-item"><strong>' + escapeHtml(comment.authorName || comment.author) + '</strong><p>' + escapeHtml(comment.body) + '</p><small>' + escapeHtml(new Date(comment.createdAt).toLocaleString()) + '</small></article>';
      }).join('') : '<p class="muted">No responses yet.</p>';
      document.getElementById('commentForm').onsubmit = function (event) {
        event.preventDefault();
        api('/__internal/api/comments/' + slug, { method: 'POST', body: JSON.stringify({ body: this.body.value }) }).then(function () { loadComments(slug); }).catch(alertError);
      };
    }).catch(function (error) {
      document.getElementById('comments').innerHTML = '<p class="notice">' + escapeHtml(error.message) + '</p>';
      var form = document.getElementById('commentForm');
      if (form) form.style.display = 'none';
    });
  }
  function getInternalHomeMarkup() {
    var groups = {};
    state.docs.forEach(function (doc) {
      if (!groups[doc.group]) groups[doc.group] = [];
      groups[doc.group].push(doc);
    });
    var cards = Object.keys(groups).map(function (group) {
      var first = groups[group][0];
      return '<button class="internal-home-card" data-doc="' + first.slug + '"><span class="internal-home-icon"></span><strong>' + escapeHtml(group) + '</strong><span>' + groups[group].length + ' internal document' + (groups[group].length === 1 ? '' : 's') + '</span></button>';
    }).join('');
    var featured = state.docs.slice(0, 6).map(function (doc) {
      return '<button class="internal-feature-link" data-doc="' + doc.slug + '"><strong>' + escapeHtml(doc.title) + '</strong><span>' + escapeHtml(doc.group) + '</span></button>';
    }).join('');
    setTimeout(function () {
      Array.prototype.forEach.call(document.querySelectorAll('.internal-home-card[data-doc], .internal-feature-link[data-doc]'), function (button) {
        button.onclick = function () { openDoc(button.dataset.doc); };
      });
      var search = document.getElementById('internalHomeSearch');
      if (search) search.oninput = function () {
        state.query = search.value;
        document.getElementById('search').value = state.query;
        render();
        renderInternalHome();
      };
    }, 0);
    return '<section class="internal-home-hero"><div><p class="internal-eyebrow">Darion Technologies</p><div class="internal-home-lockup"><img src="https://raw.githubusercontent.com/Pavandarivemula1/darion-assets/main/dariontechnologies(dt).png" alt="Darion Technologies logo"><h1><span>My</span><span>Internals</span></h1></div><p>Browse the project plans, setup references, handling guides, and troubleshooting docs assigned to your profile.</p></div><input id="internalHomeSearch" class="internal-home-search" placeholder="Search assigned internal documentation" value="' + escapeHtml(state.query) + '"></section><section class="internal-home-section"><h2>Assigned Projects</h2><div class="internal-home-grid">' + cards + '</div></section><section class="internal-home-section internal-home-directory"><h2>Needs Attention</h2><div>' + featured + '</div></section>';
  }
  function renderMarkdown(markdown) {
    var body = markdown.replace(/^---\\n[\\s\\S]*?\\n---\\n?/, '');
    var inList = false;
    function closeList() {
      if (!inList) return '';
      inList = false;
      return '</ul>';
    }
    return body.split('\\n').map(function (line) {
      if (line.indexOf('# ') === 0) return closeList() + '<h1>' + escapeHtml(line.slice(2)) + '</h1>';
      if (line.indexOf('## ') === 0) return closeList() + '<h2>' + escapeHtml(line.slice(3)) + '</h2>';
      if (line.indexOf('### ') === 0) return closeList() + '<h3>' + escapeHtml(line.slice(4)) + '</h3>';
      if (line.indexOf('- ') === 0) {
        var prefix = inList ? '' : '<ul>';
        inList = true;
        return prefix + '<li>' + escapeHtml(line.slice(2)) + '</li>';
      }
      if (line.trim() === '') return closeList();
      return closeList() + '<p>' + escapeHtml(line) + '</p>';
    }).join('') + closeList();
  }
  function alertError(error) { alert(error.message || String(error)); }
  function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]; }); }
  load();
})();
</script>
</body>
</html>`
}

function getPrivateCss() {
  return `<style>
:root {
  color-scheme: light dark;
  --bg: #ffffff;
  --panel: #f5f5f7;
  --text: #1d1d1f;
  --muted: #6e6e73;
  --border: #d2d2d7;
  --blue: #0a718a;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1d1d1f;
    --panel: #2c2c2e;
    --text: #f5f5f7;
    --muted: #a1a1a6;
    --border: #424245;
    --blue: #0a718a;
  }
}
*,
*::before,
*::after {
  box-sizing: border-box;
  border-radius: 0 !important;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
*::-webkit-scrollbar {
  width: 0;
  height: 0;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 15px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overscroll-behavior: none;
}
a, button, input, select, textarea { -webkit-tap-highlight-color: transparent; font: inherit; }
a { color: inherit; text-decoration: none; }
a:hover, button:hover { text-decoration: underline; }
:focus-visible { outline: 2px solid var(--blue); outline-offset: 3px; }
.topbar {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 max(20px, calc((100vw - 1180px) / 2));
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  backdrop-filter: saturate(180%) blur(18px);
  transform: translateZ(0);
}
.brand { font-weight: 700; }
.topnav { display: flex; gap: 22px; color: var(--muted); }
.workspace {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 28px;
  width: min(1180px, calc(100vw - 40px));
  margin: 90px auto 34px;
}
.rail {
  position: sticky;
  top: 82px;
  align-self: start;
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--border);
  background: var(--panel);
}
.rail button, .rail input {
  width: 100%;
  border: 0;
  border-radius: 8px;
  padding: 10px 12px;
  background: transparent;
  color: var(--text);
  text-align: left;
}
.rail button.active, .rail button:hover {
  background: color-mix(in srgb, var(--blue) 12%, transparent);
  color: var(--blue);
  text-decoration: none;
}
.panel {
  min-width: 0;
  border: 1px solid var(--border);
  background: var(--bg);
  padding: 28px;
}
.panel-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 22px;
  margin-bottom: 22px;
}
.panel-head h1, .login-card h1, .reader h1 { margin: 0; font-size: clamp(32px, 5vw, 56px); line-height: 1; letter-spacing: 0; }
.panel-head p, .login-card p, .muted, .row span, .list span { color: var(--muted); }
.eyebrow { margin: 0 0 10px; color: var(--muted); font-size: 12px; font-weight: 700; letter-spacing: 0; text-transform: uppercase; }
button {
  cursor: pointer;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 13px;
  background: var(--bg);
  color: var(--text);
}
button[type="submit"], .panel-head button, .login-card button, #saveJson, #build {
  background: var(--blue);
  border-color: var(--blue);
  color: white;
}
input, select, textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 11px 12px;
  background: var(--bg);
  color: var(--text);
}
label { display: grid; gap: 7px; color: var(--muted); font-size: 13px; font-weight: 600; }
.login-card {
  width: min(460px, 100%);
  margin: 7vh auto;
  display: grid;
  gap: 16px;
  border: 1px solid var(--border);
  padding: 28px;
}
.notice {
  border: 1px solid #ff9f0a;
  color: #b25000;
  padding: 10px 12px;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  border: 1px solid var(--border);
  background: var(--border);
  margin-bottom: 22px;
}
.metric-grid div {
  display: grid;
  gap: 6px;
  padding: 18px;
  background: var(--bg);
}
.metric-grid strong { font-size: 30px; }
.metric-grid span, .callout span { color: var(--muted); }
.callout, .row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid var(--border);
  padding: 14px 0;
}
.doc-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 18px;
}
.list {
  display: grid;
  align-content: start;
  border: 1px solid var(--border);
}
.list button {
  border: 0;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  display: grid;
  gap: 4px;
  text-align: left;
}
.editor {
  display: grid;
  gap: 12px;
}
.two, .inline-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.inline-form { grid-template-columns: 1fr 1fr 160px auto; }
.access-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}
.access-grid h2 {
  margin: 0 0 14px;
  font-size: 22px;
}
.stack-form {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}
textarea {
  min-height: 420px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.json-box { min-height: 520px; }
.json-tabs, .actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}
pre {
  overflow: auto;
  border: 1px solid var(--border);
  padding: 16px;
  background: var(--panel);
}
.reader {
  max-width: 860px;
}
.reader h2 {
  margin-top: 34px;
  border-top: 1px solid var(--border);
  padding-top: 24px;
}
.breadcrumbs {
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  padding-bottom: 14px;
  margin-bottom: 22px;
}
.internal-workspace {
  min-height: calc(100vh - 56px);
  padding-top: 56px;
}
.internal-sidebar {
  position: fixed;
  top: 56px;
  bottom: 0;
  left: 0;
  width: 296px;
  border-right: 1px solid var(--border);
  background: var(--bg);
  overflow: hidden;
}
.internal-sidebar::after {
  content: "Developer Documentation\A Darion Technologies\A © 2026";
  position: fixed;
  bottom: 0;
  left: 0;
  width: 296px;
  border-top: 1px solid var(--border);
  padding: 108px 24px 18px;
  background-color: var(--bg);
  background-image: url("https://raw.githubusercontent.com/Pavandarivemula1/darion-assets/main/dariontechnologies(dt).png");
  background-repeat: no-repeat;
  background-position: 24px 20px;
  background-size: 72px 72px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.55;
  white-space: pre-line;
}
.internal-sidebar-inner {
  height: 100%;
  overflow-y: auto;
  padding: 28px 20px 212px;
}
.internal-sidebar-title {
  margin: 0 0 18px;
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
}
.internal-search {
  height: 40px;
  margin-bottom: 22px;
  border: 1px solid var(--border);
  background: var(--bg);
  font-size: 14px;
}
.internal-sidebar button {
  display: grid;
  gap: 4px;
  width: 100%;
  border: 0;
  border-left: 2px solid transparent;
  padding: 9px 0 9px 12px;
  background: transparent;
  text-align: left;
}
.internal-sidebar button span {
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
}
.internal-sidebar button small {
  color: var(--muted);
  font-size: 12px;
}
.internal-sidebar button.active {
  border-left-color: var(--blue);
}
.internal-sidebar button.active span,
.internal-sidebar button:hover span {
  color: var(--blue);
}
.internal-doc {
  max-width: 1180px;
  min-height: calc(100vh - 56px);
  margin-left: 296px;
  padding: 48px 40px 96px;
}
.internal-breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 34px;
  color: var(--muted);
  font-size: 13px;
}
.internal-breadcrumbs a {
  color: var(--blue);
}
.internal-breadcrumbs strong {
  color: var(--muted);
  font-weight: 500;
}
.internal-document-body {
  max-width: 760px;
}
.internal-document-body:has(.internal-home-hero) {
  max-width: 980px;
}
.internal-home-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 48px;
  align-items: end;
  border-bottom: 1px solid var(--border);
  padding: 34px 0 44px;
}
.internal-eyebrow {
  margin: 0 0 10px;
  color: var(--muted) !important;
  font-size: 13px !important;
  font-weight: 600;
  line-height: 1.3 !important;
}
.internal-home-lockup {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  align-items: center;
  gap: 24px;
}
.internal-home-lockup img {
  width: 128px;
  height: 128px;
  object-fit: contain;
}
.internal-home-lockup h1 {
  margin: 0;
  color: var(--text);
  font-size: clamp(52px, 6vw, 72px);
  font-weight: 700;
  line-height: 1.04;
}
.internal-home-lockup h1 span {
  display: block;
}
.internal-home-hero p:last-child {
  max-width: 680px;
  margin: 18px 0 0;
  color: color-mix(in srgb, var(--text) 78%, var(--muted)) !important;
  font-size: 21px !important;
  line-height: 1.42 !important;
}
.internal-home-search {
  min-height: 44px;
  margin-bottom: 7px;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  font-size: 15px;
}
.internal-home-section {
  margin-top: 40px;
}
.internal-home-section h2 {
  margin: 0 0 20px;
  border: 0;
  padding: 0;
  color: var(--text);
  font-size: 28px;
  font-weight: 700;
}
.internal-home-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid var(--border);
}
.internal-home-card {
  min-height: 190px;
  border: 0;
  border-right: 1px solid var(--border);
  padding: 24px 20px;
  background: var(--bg);
  text-align: left;
}
.internal-home-card:last-child {
  border-right: 0;
}
.internal-home-card:hover {
  background: var(--panel);
  text-decoration: none;
}
.internal-home-icon {
  display: block;
  width: 42px;
  height: 42px;
  margin-bottom: 18px;
  border: 1.5px solid var(--blue);
}
.internal-home-card strong {
  display: block;
  margin-bottom: 10px;
  color: var(--text);
  font-size: 21px;
  line-height: 1.16;
}
.internal-home-card span:last-child {
  color: color-mix(in srgb, var(--text) 78%, var(--muted));
  font-size: 15px;
  line-height: 1.38;
}
.internal-home-directory {
  border-top: 1px solid var(--border);
  padding-top: 36px;
}
.internal-home-directory > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--border);
}
.internal-feature-link {
  display: grid;
  gap: 6px;
  border: 0;
  border-bottom: 1px solid var(--border);
  padding: 18px 0;
  background: transparent;
  text-align: left;
}
.internal-feature-link strong {
  color: var(--text);
  font-size: 16px;
}
.internal-feature-link span {
  color: var(--muted);
  font-size: 14px;
}
.internal-document-body h1 {
  margin: 0 0 22px;
  color: var(--text);
  font-size: 48px;
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: 0;
}
.internal-document-body h2 {
  margin: 48px 0 16px;
  border-top: 1px solid var(--border);
  padding-top: 28px;
  color: var(--text);
  font-size: 28px;
  font-weight: 650;
  line-height: 1.2;
}
.internal-document-body h3 {
  margin: 32px 0 12px;
  color: var(--text);
  font-size: 21px;
  font-weight: 650;
}
.internal-document-body p,
.internal-document-body li {
  color: color-mix(in srgb, var(--text) 78%, var(--muted));
  font-size: 17px;
  line-height: 1.65;
}
.internal-document-body ul {
  margin: 14px 0 0;
  padding-left: 22px;
}
.internal-responses {
  max-width: 760px;
  margin-top: 56px;
  border-top: 1px solid var(--border);
  padding-top: 28px;
}
.internal-responses h2 {
  margin-top: 0;
  border-top: 0;
  padding-top: 0;
}
.response-item {
  border-bottom: 1px solid var(--border);
  padding: 16px 0;
}
.response-item p {
  margin: 8px 0;
}
.response-item small {
  color: var(--muted);
}
.response-form {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}
.response-form textarea {
  min-height: 120px;
}
.internal-doc::after {
  content: "";
  position: fixed;
  right: 0;
  bottom: 0;
  left: 296px;
  height: 1px;
  background: var(--border);
}
@media (max-width: 780px) {
  .topbar {
    height: 52px;
    padding: 0 16px;
  }
  .topnav { gap: 14px; font-size: 14px; }
  .workspace {
    display: block;
    width: 100%;
    margin: 0;
  }
  .rail {
    position: static;
    border-width: 0 0 1px;
    overflow-x: auto;
    display: flex;
    gap: 8px;
    padding: 10px 14px;
  }
  .rail .eyebrow { display: none; }
  .rail button { white-space: nowrap; width: auto; }
  .panel {
    border: 0;
    padding: 26px 20px;
  }
  .internal-workspace {
    padding-top: 52px;
  }
  .internal-sidebar {
    position: static;
    width: 100%;
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
  .internal-sidebar::after {
    display: none;
  }
  .internal-sidebar-inner {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 10px 14px;
  }
  .internal-sidebar-title {
    display: none;
  }
  .internal-search {
    min-width: 220px;
    margin: 0;
  }
  .internal-sidebar button {
    width: auto;
    min-width: 160px;
    border-left: 0;
    border-bottom: 2px solid transparent;
    padding: 9px 10px;
  }
  .internal-sidebar button.active {
    border-bottom-color: var(--blue);
  }
  .internal-doc {
    margin-left: 0;
    padding: 32px 20px 72px;
  }
  .internal-document-body h1 {
    font-size: 40px;
  }
  .internal-document-body h2 {
    font-size: 25px;
  }
  .internal-home-hero {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .internal-home-lockup {
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 16px;
  }
  .internal-home-lockup img {
    width: 72px;
    height: 72px;
  }
  .internal-home-lockup h1 {
    font-size: 40px;
  }
  .internal-home-hero p:last-child {
    font-size: 20px !important;
  }
  .internal-home-grid,
  .internal-home-directory > div {
    grid-template-columns: 1fr;
  }
  .internal-home-card {
    min-height: 0;
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
  .internal-doc::after {
    left: 0;
  }
  .panel-head, .doc-layout, .two, .inline-form, .access-grid {
    display: grid;
    grid-template-columns: 1fr;
  }
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>`
}
