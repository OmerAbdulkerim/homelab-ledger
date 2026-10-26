export const entities = {
  servers: {
    singular: 'server',
    label: 'Servers',
    fields: [
      { name: 'name', label: 'Name', required: true, max: 80 },
      {
        name: 'hostname',
        label: 'Hostname or IP address',
        required: true,
        max: 253,
      },
      { name: 'purpose', label: 'Purpose', required: true, max: 200 },
      { name: 'notes', label: 'Notes', type: 'textarea', max: 5000 },
    ],
  },
  applications: {
    singular: 'application',
    label: 'Applications',
    fields: [
      { name: 'name', label: 'Name', required: true, max: 80 },
      { name: 'description', label: 'Description', required: true, max: 500 },
      {
        name: 'github_owner',
        label: 'GitHub owner',
        max: 100,
        hint: 'Optional. Provide both owner and repository, or leave both blank.',
      },
      { name: 'github_repo', label: 'GitHub repository', max: 100 },
      { name: 'notes', label: 'Notes', type: 'textarea', max: 5000 },
    ],
  },
};
entities.deployments = {
  singular: 'deployment',
  label: 'Deployments',
  fields: [
    {
      name: 'application_id',
      label: 'Application',
      type: 'select',
      required: true,
      options: (data) => [
        ['', 'Choose an application'],
        ...data.applications.map((row) => [row.id, row.name]),
      ],
    },
    {
      name: 'server_id',
      label: 'Server',
      type: 'select',
      required: true,
      options: (data) => [
        ['', 'Choose a server'],
        ...data.servers.map((row) => [row.id, row.name]),
      ],
    },
    {
      name: 'label',
      label: 'Environment / label',
      required: true,
      max: 80,
      hint: 'For example: production, staging or internal.',
    },
    {
      name: 'status',
      label: 'Recorded status',
      type: 'select',
      required: true,
      options: [
        ['planned', 'planned'],
        ['running', 'running'],
        ['stopped', 'stopped'],
      ],
    },
    {
      name: 'installed_version',
      label: 'Installed version',
      max: 100,
      hint: 'Record the exact tag or version. Required unless planned.',
    },
    {
      name: 'url',
      label: 'Web interface URL',
      type: 'url',
      max: 2048,
      hint: 'Optional HTTP(S) URL. No embedded credentials.',
    },
    { name: 'deployed_on', label: 'Deployment date', type: 'date' },
    { name: 'notes', label: 'Notes', type: 'textarea', max: 5000 },
  ],
};
entities.maintenance = {
  singular: 'task',
  label: 'Maintenance',
  fields: [
    { name: 'title', label: 'Title', required: true, max: 160 },
    {
      name: 'target',
      label: 'Related record',
      type: 'select',
      required: true,
      userReadOnly: true,
      options: (data) => [
        ['', 'Choose one server or deployment'],
        ...data.servers.map((row) => [
          `server:${row.id}`,
          `Server · ${row.name}`,
        ]),
        ...data.deployments.map((row) => [
          `deployment:${row.id}`,
          `Deployment · ${data.applications.find((app) => app.id === row.application_id)?.name} / ${row.label} on ${data.servers.find((server) => server.id === row.server_id)?.name}`,
        ]),
      ],
    },
    {
      name: 'assigned_user_id',
      label: 'Assigned user',
      type: 'select',
      adminOnly: true,
      options: (data) => [
        ['', 'Unassigned'],
        ...data.users.map((row) => [row.id, row.name]),
      ],
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      hideOnRegularCreate: true,
      options: [
        ['open', 'open'],
        ['in_progress', 'in progress'],
        ['completed', 'completed'],
      ],
    },
    { name: 'due_on', label: 'Due date', type: 'date', userReadOnly: true },
    { name: 'description', label: 'Description', type: 'textarea', max: 5000 },
    {
      name: 'outcome',
      label: 'Outcome',
      type: 'textarea',
      max: 5000,
      hint: 'Required when marking a task completed.',
    },
  ],
};
entities.users = {
  singular: 'user',
  label: 'Users',
  fields: [
    { name: 'name', label: 'Name', required: true, max: 80 },
    { name: 'email', label: 'Email', type: 'email', required: true, max: 254 },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      required: true,
      options: [
        ['user', 'Regular user'],
        ['admin', 'Admin'],
      ],
    },
    {
      name: 'password',
      label: 'Initial preview password',
      type: 'password',
      newOnly: true,
      required: true,
      min: 8,
      max: 128,
      hint: 'Use a made-up password. It exists in memory until refresh only.',
    },
  ],
};
