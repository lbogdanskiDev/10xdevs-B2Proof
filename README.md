# B2Proof

A modern, opinionated web application built with Next.js for building fast, accessible, and AI-friendly web experiences.

## Tech Stack

- [Next.js](https://nextjs.org/) v15.1.0 - React framework for production
- [React](https://react.dev/) v19.0.0 - UI library for building interactive components
- [TypeScript](https://www.typescriptlang.org/) v5.8 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4.0 - Utility-first CSS framework
- [TipTap](https://tiptap.dev/) v3.0 - Headless rich text editor
- [Radix UI](https://www.radix-ui.com/) - Accessible component primitives

## Prerequisites

- Node.js v20.0.0 or higher (as specified in `package.json`)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/lbogdanskiDev/10xdevs-B2Proof.git
cd 10xdevs-B2Proof
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production and generate sitemap
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```md
.
├── src/
│   ├── app/        # Next.js App Router pages
│   ├── components/ # React components
│   ├── layouts/    # Layout components
│   ├── lib/        # Utility functions and helpers
│   ├── pages/      # Next.js Pages Router (legacy)
│   └── styles/     # Global styles
├── public/         # Public assets
```

## AI Development Support

This project is configured with AI development tools to enhance the development experience, providing guidelines for:

- Project structure
- Coding practices
- Frontend development
- Styling with Tailwind
- Accessibility best practices
- Next.js and React guidelines

### Cursor IDE

The project includes AI rules in `.cursor/rules/` directory that help Cursor IDE understand the project structure and provide better code suggestions.

### GitHub Copilot

AI instructions for GitHub Copilot are available in `.github/copilot-instructions.md`

### Windsurf

The `.windsurfrules` file contains AI configuration for Windsurf.

## Contributing

Please follow the AI guidelines and coding practices defined in the AI configuration files when contributing to this project.

## License

MIT
