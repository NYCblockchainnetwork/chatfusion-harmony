# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/5269b2ff-5d9a-4e06-9021-1473fa25e662

## Configuration

### Environment Variables

This project uses environment variables for configuration. A `.env.example` file is provided as a template.

**Important Security Note:** The `.env` file contains sensitive information and should never be committed to version control. While we cannot modify the `.gitignore` file directly, please follow these best practices:

1. Make a copy of `.env.example` and rename it to `.env`
2. Add your actual API keys and secrets to your `.env` file
3. Never share your `.env` file or commit it to public repositories
4. When you clone this repository, you'll need to create your own `.env` file

### Google Authentication

To enable Google Authentication:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or use an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" and select "OAuth client ID"
5. Set the application type to "Web application"
6. Add your application URL to the authorized JavaScript origins
7. Copy the generated Client ID
8. Add to your `.env` file:
   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id-here
   ```

### Telegram Integration

To enable Telegram integration:

1. Go to [my.telegram.org](https://my.telegram.org/) and log in
2. Go to "API development tools" and create a new application
3. Copy your API ID and API Hash
4. Add to your `.env` file:
   ```
   VITE_TELEGRAM_API_ID=your-api-id
   VITE_TELEGRAM_API_HASH=your-api-hash
   ```

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/5269b2ff-5d9a-4e06-9021-1473fa25e662) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/5269b2ff-5d9a-4e06-9021-1473fa25e662) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)

## Dependencies Installation

After cloning the repository, you'll need to install the dependencies:

```sh
# Install all required dependencies
npm install
```

This will create a `node_modules` directory with all the necessary packages.
