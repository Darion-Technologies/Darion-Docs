---
title: "M1 Planning"
group: "Internal"
order: 1000
status: "published"
owner: "docs"
tags: "planning, project"
visibility: "internal"
project: "darion-bpo-platform"
category: "planning"
---
# M1 Planning

*Project:* Darion BPO Platform  
**Phase:** M1, Discovery and Foundation  
**Prepared for:** Internal execution team  
**Phase owner:** Project Lead  
**Document type:** Planning and execution reference  
**Version:** 1.0  


## 1. Purpose

M1 is the foundation phase of the Darion BPO Platform. The main purpose of this phase is to convert the project from idea and discussion into a structured execution system.

This phase focuses on understanding the product, defining the first version of the system, preparing the team, assigning clear responsibilities, setting up the development environment, documenting early decisions, and creating the base structure required for upcoming development phases.

M1 should not be treated as a heavy feature delivery phase. It is mainly a planning, setup, discovery, documentation, and foundation phase. The quality of M1 decides how cleanly the project can move into M2 and future phases.

---

## 2. Phase objective

The objective of M1 is to establish a clear project foundation before active product development begins.

By the end of M1, the team should have:

- A clear understanding of the BPO platform vision
- Defined modules and first-phase scope
- Assigned roles and responsibilities
- Basic project documentation
- Initial UI and workflow references
- Development setup completed
- GitHub workflow started
- QA and reporting process defined
- Basic frontend and backend structure planned
- A clean task ownership system for every team member

---

## 3. M1 scope

M1 covers the early discovery and foundation work required to start the Darion BPO Platform properly.

### Included in M1

- Project understanding
- Product vision documentation
- Module identification
- User role definition
- Internal team role assignment
- Basic UI flow planning
- Tech stack confirmation
- Repository and folder structure planning
- GitHub setup
- Daily task tracking
- QA process setup
- Documentation process setup
- Initial frontend learning and practice
- Basic backend learning and API planning
- Internal communication structure
- Timeline and milestone planning

### Not included in M1

- Full production development
- Final deployment
- Payment system integration
- Advanced automation
- Complete CRM development
- Complete employee management system
- Advanced dashboards
- Security hardening
- Client-ready release
- Enterprise-level testing
- Large-scale infrastructure setup

These items belong to later phases after the foundation is stable.

---

## 4. Phase duration

M1 should be planned as a short and focused foundation phase.

**Recommended duration:** 4 weeks  
**Phase type:** Discovery, planning, setup, and foundation  
**Delivery style:** Controlled execution with daily updates  

### Week structure

| Week | Focus area | Expected result |
|---|---|---|
| Week 1 | Project understanding and setup | Team understands the project and tools are ready |
| Week 2 | Module planning and documentation | Core modules, workflows, and documents are prepared |
| Week 3 | Basic development practice | Frontend, backend, QA, and GitHub practice begins |
| Week 4 | Review and M2 readiness | Gaps are fixed and next phase is prepared |

---

## 5. Project overview

The Darion BPO Platform is an internal business operations platform planned to support BPO workflows, employee coordination, CRM activities, task management, reporting, documentation, and operational control.

The platform is intended to become a structured system where different teams can manage work, track responsibilities, maintain employee data, handle client-related processes, and support internal execution.

The first version should be simple, clear, and stable. It should avoid unnecessary complexity during M1 and focus on building the correct foundation.

---

## 6. Product direction

The product should be built with a clean enterprise mindset.

### Product principles

- Simple before advanced
- Clear before complex
- Stable before fast
- Documented before expanded
- Role-based before open access
- Practical before decorative
- Internal control before public release

### Design direction

The platform should follow a clean and professional interface style.

The interface should be:

- Minimal
- Sharp
- Calm
- Structured
- Easy to understand
- Easy to test
- Easy to document
- Suitable for enterprise users

The product should avoid overloaded screens, unnecessary animations, confusing icons, and unclear navigation.

---

## 7. Core modules for planning

M1 should identify the first set of modules required for the platform.

### 7.1 Authentication module

The authentication module handles user login and access entry.

Expected planning items:

- Login page
- Signup or user creation flow, if required
- Forgot password flow, if required later
- Session handling concept
- Role-based entry
- Basic error handling
- Empty and loading states

### 7.2 Dashboard module

The dashboard module gives users a quick view of the system.

Expected planning items:

- Summary cards
- Recent activity
- Assigned tasks
- Pending actions
- Basic charts, if required later
- Role-based dashboard view

### 7.3 Employee module

The employee module manages internal team and staff information.

Expected planning items:

- Employee list
- Employee profile
- Role information
- Department or project assignment
- Status tracking
- Basic employee records

### 7.4 CRM module

The CRM module supports client and lead management.

Expected planning items:

- Lead list
- Client list
- Contact information
- Lead status
- Follow-up tracking
- Notes and activity history

### 7.5 Task module

The task module helps the team manage daily work.

Expected planning items:

- Task creation
- Task assignment
- Task priority
- Task status
- Due dates
- Comments or updates
- Completion tracking

### 7.6 Reports module

The reports module gives visibility into work progress.

Expected planning items:

- Daily reports
- Weekly summaries
- Employee task reports
- CRM reports
- QA reports
- Export planning for later phases

### 7.7 Settings module

The settings module controls platform configuration.

Expected planning items:

- User settings
- Role settings
- Permission settings
- Organization settings
- System preferences

---

## 8. User roles

M1 should clearly define the first-level user roles.

### 8.1 Project Lead

The Project Lead owns project direction, task control, review, planning, and final decision-making.

Responsibilities:

- Define project priorities
- Review team output
- Approve module scope
- Assign weekly tasks
- Track project progress
- Review documentation
- Guide technical and product decisions
- Prepare M2 direction

### 8.2 Full Stack Developer

The Full Stack Developer works across frontend, backend, database, and integration planning.

Responsibilities:

- Understand the full system flow
- Plan frontend and backend connection
- Create basic API structure
- Support database planning
- Build core reusable logic
- Coordinate with frontend and backend team members
- Support GitHub workflow

### 8.3 Frontend Developer

The Frontend Developer focuses on screens, layout, UI structure, responsiveness, and frontend implementation.

Responsibilities:

- Build clean UI screens
- Follow approved design direction
- Create reusable frontend components
- Test layouts on desktop and mobile
- Fix visual issues
- Coordinate with QA for bug fixing
- Maintain frontend consistency

### 8.4 Backend Developer

The Backend Developer focuses on API planning, server-side logic, data handling, and backend structure.

Responsibilities:

- Plan backend routes
- Create basic API endpoints
- Define request and response structure
- Support database schema planning
- Handle backend validation
- Prepare backend documentation
- Support integration with frontend

### 8.5 QA and Documentation Trainee

The QA and Documentation Trainee supports testing, bug reporting, documentation, and basic frontend learning.

Responsibilities:

- Test assigned pages
- Report bugs clearly
- Take screenshots of issues
- Prepare simple module notes
- Write user guides
- Maintain daily work summaries
- Learn basic HTML, CSS, JavaScript, and GitHub
- Support frontend review activities

### 8.6 UI and Documentation Support

This role supports visual review, documentation cleanup, and presentation of internal materials.

Responsibilities:

- Review screen clarity
- Check text consistency
- Support document formatting
- Help organize screenshots
- Maintain simple user-facing wording
- Support product explanation notes

---

## 9. Team operating model

The team should follow a simple daily execution model.

### Daily flow

1. Project Lead assigns or confirms daily tasks
2. Team members work on assigned items
3. Developers push updates or share progress
4. QA checks completed screens or flows
5. Bugs are reported with screenshots
6. Documentation is updated
7. Project Lead reviews progress
8. Pending items are moved to the next working day

### Daily update format

Each team member should provide a short daily update.

```md
Date:
Name:
Role:
Today completed:
In progress:
Blocked by:
Tomorrow plan:
Files or links:
```

### Bug report format

```md
Bug title:
Module:
Page:
Priority:
Device:
Steps to reproduce:
Expected result:
Actual result:
Screenshot:
Assigned to:
Status:
```

---

## 10. Documentation system

Documentation is a required output of M1.

The team should document decisions early so that future phases are easier to execute.

### Required M1 documents

- Project overview
- M1 plan
- Team roles
- Module list
- User role list
- Basic workflow notes
- Daily task tracker
- Bug tracker
- QA checklist
- Frontend setup notes
- Backend setup notes
- GitHub workflow notes
- M2 preparation notes

### Documentation principles

- Keep writing simple
- Use clear headings
- Avoid unnecessary words
- Document decisions immediately
- Write for future team members
- Keep screenshots organized
- Maintain version history

---

## 11. GitHub workflow

GitHub should be used from M1 to build proper development discipline.

### Repository setup

The repository should include a clean structure.

Recommended folders:

```txt
project-root/
  frontend/
  backend/
  docs/
  assets/
  qa/
  planning/
  README.md
```

### Branching model

For M1, the branching model can stay simple.

Recommended branches:

- main
- dev
- feature/module-name
- fix/bug-name
- docs/document-name

### Commit message examples

```txt
init project structure
add login page layout
update m1 planning document
fix dashboard mobile alignment
add qa checklist
create employee module notes
```

### GitHub practice tasks

Every team member should understand:

- How to clone a repository
- How to create a branch
- How to commit changes
- How to push changes
- How to pull latest changes
- How to create a pull request
- How to read file history
- How to resolve basic conflicts later

---

## 12. Development foundation

M1 should prepare the technical foundation but avoid overbuilding.

### Frontend foundation

Frontend planning should include:

- Project setup
- Routing structure
- Layout structure
- Component planning
- Page planning
- Responsive design basics
- Form design basics
- Table design basics
- Loading and empty states
- Error message style
- UI consistency rules

### Backend foundation

Backend planning should include:

- API structure
- Route planning
- Controller or service planning
- Validation planning
- Database connection planning
- Error response format
- Authentication planning
- Role-based access planning
- Logging planning
- Documentation of endpoints

### Database foundation

Database planning should include:

- User table planning
- Employee table planning
- Client table planning
- Lead table planning
- Task table planning
- Role table planning
- Activity or audit table planning
- Basic relationships between modules

---

## 13. UI and design foundation

The design system should stay simple during M1.

### UI rules

- Use clean spacing
- Use consistent font sizes
- Use clear headings
- Use simple buttons
- Use proper form labels
- Use readable table layouts
- Use mobile-friendly spacing
- Avoid unnecessary colors
- Avoid heavy visual effects
- Avoid confusing navigation

### Frontend interaction rule

For future frontend development, mobile tap highlight should be removed while keeping accessibility intact.

Recommended CSS:

```css
* {
  -webkit-tap-highlight-color: transparent;
}

:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}
```

This keeps the interface clean on mobile while preserving keyboard accessibility.

---

## 14. QA plan

QA begins from M1, even before full product development.

### QA focus areas

- Page opening correctly
- Button behavior
- Form validation
- Navigation flow
- Mobile responsiveness
- Desktop layout
- Text spelling
- Alignment
- Loading states
- Empty states
- Error states
- Broken links
- Visual consistency

### QA checklist

```md
Page name:
Tested by:
Date:
Desktop tested:
Mobile tested:
Buttons working:
Forms working:
Navigation working:
Text checked:
Alignment checked:
Screenshots added:
Bugs reported:
Status:
```

### Bug priority levels

| Priority | Meaning |
|---|---|
| Critical | Blocks main flow or login |
| High | Breaks important function |
| Medium | Affects usability or layout |
| Low | Minor text, spacing, or visual issue |

---

## 15. M1 weekly plan

## Week 1, Understanding and setup

### Goal

The first week should make the team fully understand the project and prepare the basic working environment.

### Tasks

- Explain the BPO platform vision
- Define the problem the platform solves
- Identify first modules
- Assign team roles
- Set up communication process
- Create GitHub repository
- Create basic folder structure
- Prepare daily update format
- Prepare bug report format
- Create first documentation folder
- Confirm tools and access

### Outputs

- Project overview note
- Team role document
- Module list
- GitHub repository structure
- Daily update template
- Bug report template

---

## Week 2, Module planning and workflow design

### Goal

The second week should convert product ideas into simple module plans and workflows.

### Tasks

- Plan authentication flow
- Plan dashboard flow
- Plan employee module
- Plan CRM module
- Plan task module
- Plan reports module
- Create basic page list
- Define user roles
- Define permission ideas
- Prepare simple wireframe notes
- Document module-level responsibilities

### Outputs

- Module planning document
- User role document
- Page list
- Workflow notes
- Basic permission plan
- Initial wireframe references

---

## Week 3, Development practice and QA setup

### Goal

The third week should begin basic implementation practice and introduce proper QA habits.

### Tasks

- Create frontend practice pages
- Create reusable layout practice
- Create basic form and table examples
- Plan backend API format
- Create sample endpoint notes
- Practice GitHub commits
- Start QA testing on available pages
- Prepare bug tracker
- Prepare module documentation drafts
- Start daily status review

### Outputs

- Frontend practice pages
- Backend API notes
- QA checklist
- Bug tracker
- GitHub commit history
- Module documentation drafts

---

## Week 4, Review and M2 readiness

### Goal

The fourth week should review all M1 work and prepare the team for M2 execution.

### Tasks

- Review all M1 documents
- Review team performance
- Review completed tasks
- Identify incomplete items
- Fix documentation gaps
- Finalize module priority
- Confirm M2 development scope
- Prepare M2 task allocation
- Create M1 completion report
- Create M2 readiness checklist

### Outputs

- M1 completion report
- Final module priority list
- M2 readiness checklist
- Updated team role clarity
- Pending issue list
- M2 planning notes

---

## 16. Individual task planning

## 16.1 Project Lead tasks

### Main focus

Project direction, execution control, review, planning, and final approval.

### Tasks

- Finalize M1 scope
- Assign team responsibilities
- Review daily updates
- Review documentation
- Track progress
- Approve completed work
- Identify blockers
- Guide product decisions
- Prepare M2 planning
- Maintain project discipline

### Output

- Approved M1 plan
- Task allocation
- Review notes
- M2 direction

---

## 16.2 Full Stack Developer tasks

### Main focus

Full system understanding, frontend-backend connection, API planning, and technical structure.

### Tasks

- Understand complete platform flow
- Support repository structure
- Plan frontend and backend connection
- Create basic API planning notes
- Support database structure planning
- Review module logic
- Coordinate with frontend and backend team
- Maintain clean code practice
- Support GitHub workflow
- Prepare technical notes

### Output

- API planning notes
- Technical structure notes
- Basic integration plan
- Development progress updates

---

## 16.3 Frontend Developer tasks

### Main focus

Frontend screens, layout, responsiveness, and component structure.

### Tasks

- Create base layout
- Create login page UI
- Create dashboard UI draft
- Create employee list UI draft
- Create CRM list UI draft
- Create task list UI draft
- Build reusable components
- Test responsiveness
- Fix alignment issues
- Coordinate with QA

### Output

- Frontend screen drafts
- Component structure
- Responsive layout updates
- UI bug fixes

---

## 16.4 Backend Developer tasks

### Main focus

Backend structure, API planning, validation, and database logic.

### Tasks

- Plan backend folder structure
- Define initial API routes
- Prepare authentication route plan
- Prepare employee route plan
- Prepare CRM route plan
- Prepare task route plan
- Define response format
- Define error format
- Support database schema planning
- Document backend decisions

### Output

- Backend route plan
- API response format
- Error handling notes
- Database planning notes

---

## 16.5 QA and Documentation Trainee tasks

### Main focus

Testing, documentation, screenshots, bug reporting, and frontend basics.

### Tasks

- Test login page flow
- Test dashboard layout
- Test buttons and forms
- Check mobile layout
- Check desktop layout
- Report bugs with screenshots
- Maintain daily QA sheet
- Write simple module notes
- Prepare user guide drafts
- Learn basic HTML, CSS, JavaScript, and GitHub
- Practice small frontend changes

### Output

- Daily bug report
- QA checklist
- Module notes
- Screenshot folder
- Learning progress summary

---

## 17. Communication plan

The team should keep communication clear and simple.

### Daily communication

- Each member gives one daily update
- Blockers should be reported early
- Completed work should include files or links
- Bugs should include screenshots
- Decisions should be documented

### Weekly communication

At the end of every week, the Project Lead should review:

- Completed work
- Pending work
- Team performance
- Blockers
- Quality issues
- Documentation quality
- Next week priorities

---

## 18. Tools required

M1 requires only essential tools.

### Recommended tools

| Tool | Purpose |
|---|---|
| GitHub | Code, version control, issues, documentation |
| VS Code or Cursor | Development |
| Google Docs or Markdown | Documentation |
| Google Sheets or GitHub Projects | Task tracking |
| Figma or screenshots | UI planning |
| Browser dev tools | Frontend testing |
| WhatsApp or team chat | Daily coordination |

---

## 19. Risk management

M1 should identify risks early.

### Possible risks

- Unclear module scope
- Team confusion
- Weak GitHub practice
- Poor documentation
- No daily updates
- Delayed task completion
- UI inconsistency
- Backend planning gaps
- QA not reporting clearly
- Too much feature expansion too early

### Risk control actions

- Keep M1 scope limited
- Review work daily
- Keep documentation simple
- Assign clear owners
- Track bugs from the beginning
- Avoid unnecessary features
- Prepare M2 only after M1 is stable

---

## 20. Quality standards

M1 work should follow basic quality standards.

### Documentation quality

- Clear headings
- Simple language
- No unnecessary repetition
- No incomplete sections
- Proper task ownership
- Version maintained
- Easy to understand by a new team member

### UI quality

- Clean layout
- Consistent spacing
- Responsive behavior
- Clear buttons
- Proper labels
- No broken navigation
- No obvious spelling mistakes

### Code quality

- Clean folder structure
- Meaningful file names
- Simple reusable components
- Clear API naming
- Basic validation
- Proper GitHub commits
- No random unused files

---

## 21. M1 deliverables

By the end of M1, the team should deliver the following:

- M1 planning document
- Project overview document
- Team roles document
- Module list
- User role list
- Page list
- Workflow notes
- GitHub repository structure
- Frontend setup notes
- Backend setup notes
- QA checklist
- Bug tracker
- Daily update tracker
- Initial UI drafts or references
- M1 completion report
- M2 readiness checklist

---

## 22. M1 completion criteria

M1 can be considered complete only when the foundation is ready for M2.

### Completion checklist

```md
Project vision documented:
M1 scope finalized:
Team roles assigned:
Core modules listed:
User roles defined:
GitHub repository ready:
Folder structure planned:
Daily update process active:
QA checklist ready:
Bug tracker ready:
Frontend setup planned:
Backend setup planned:
Database planning started:
Module documentation started:
Week 1 review completed:
Week 2 review completed:
Week 3 review completed:
Week 4 review completed:
M1 completion report prepared:
M2 scope drafted:
Project Lead approval:
```

---

## 23. M2 preparation

M2 should begin only after the M1 foundation is reviewed.

### M2 should focus on

- Building actual core modules
- Implementing authentication
- Creating dashboard structure
- Creating employee module base
- Creating CRM module base
- Creating task module base
- Starting real backend APIs
- Connecting frontend and backend
- Setting up database tables
- Starting structured QA
- Improving documentation

### M2 should not start if

- Team roles are unclear
- Repository is not ready
- Module list is not finalized
- No QA process exists
- No daily tracking exists
- Frontend and backend structure is not planned
- Documentation is missing

---

## 24. Final note

M1 is the control layer of the project. It creates the structure, discipline, documentation, ownership, and technical direction required to build the Darion BPO Platform properly.

A strong M1 reduces confusion in future phases. It helps the team move faster, avoid repeated mistakes, and build the platform with clarity.

The goal of M1 is not to finish the product. The goal is to make the team ready to build the product correctly.

---

© 2026 Darion Technologies.  
https://tech.darion.in
