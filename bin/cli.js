#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

// 平台配置
const PLATFORMS = {
  claude: {
    name: 'Claude Code',
    skillsDir: '.claude/skills',
    commandsDir: null, // Claude Code 不使用 commands 目录
  },
  opencode: {
    name: 'OpenCode',
    skillsDir: '.opencode/skills',
    commandsDir: '.opencode/commands',
  }
};

// 自动检测平台
function detectPlatform(cwd) {
  // 检查是否存在 .claude 目录
  if (fs.existsSync(path.join(cwd, '.claude'))) {
    return 'claude';
  }
  // 检查是否存在 .opencode 目录
  if (fs.existsSync(path.join(cwd, '.opencode'))) {
    return 'opencode';
  }
  // 默认返回 claude
  return 'claude';
}

program
  .name('sdd-cli')
  .description('SDD (Skill-Driven Development) CLI Tool - Trinity Workflow v2 (Claude Code + OpenCode)')
  .version('2.0.0');

program
  .command('init')
  .description('Initialize SDD workflow configuration in current project')
  .option('-f, --force', 'Overwrite existing files', false)
  .option('--skip-commands', 'Skip copying command files', false)
  .option('--skip-schema', 'Skip copying schema files', false)
  .option('--skip-skills', 'Skip copying skill files', false)
  .option('--platform <name>', 'Target platform: claude | opencode (auto-detect by default)')
  .option('--schema <name>', 'Schema to use: trinity-workflow-v2 | trinity-workflow | hybrid-workflow', 'trinity-workflow-v2')
  .action(async (options) => {
    const cwd = process.cwd();

    // 自动检测或使用指定平台
    const platform = options.platform || detectPlatform(cwd);
    const platformConfig = PLATFORMS[platform];

    if (!platformConfig) {
      console.error(chalk.red(`\n❌ Unknown platform: ${platform}`));
      console.log(chalk.gray('Available platforms: claude, opencode'));
      process.exit(1);
    }

    console.log(chalk.blue('\n🚀 Initializing SDD workflow v2...\n'));
    console.log(chalk.gray(`Platform: ${platformConfig.name}`));
    console.log(chalk.gray(`Schema: ${options.schema}\n`));

    try {
      // 1. Copy openspec config and schema
      if (!options.skipSchema) {
        const openspecDir = path.join(cwd, 'openspec');

        // Create openspec directory structure
        await fs.ensureDir(path.join(openspecDir, 'schemas', options.schema));
        await fs.ensureDir(path.join(openspecDir, 'specs'));
        await fs.ensureDir(path.join(openspecDir, 'changes'));

        // Copy config.yaml
        const configSrc = path.join(TEMPLATES_DIR, 'openspec', 'config.yaml');
        const configDest = path.join(openspecDir, 'config.yaml');

        if (await fs.exists(configDest) && !options.force) {
          console.log(chalk.yellow('⚠ config.yaml already exists, use --force to overwrite'));
        } else {
          // Update config.yaml with selected schema
          let configContent = await fs.readFile(configSrc, 'utf8');
          configContent = configContent.replace(/schema: .*/, `schema: ${options.schema}`);
          await fs.writeFile(configDest, configContent);
          console.log(chalk.green('✓ Created openspec/config.yaml'));
        }

        // Copy selected schema
        const schemaSrc = path.join(TEMPLATES_DIR, 'openspec', 'schemas', options.schema, 'schema.yaml');
        const schemaDest = path.join(openspecDir, 'schemas', options.schema, 'schema.yaml');

        if (await fs.exists(schemaDest) && !options.force) {
          console.log(chalk.yellow(`⚠ ${options.schema}/schema.yaml already exists, use --force to overwrite`));
        } else if (await fs.exists(schemaSrc)) {
          await fs.copy(schemaSrc, schemaDest);
          console.log(chalk.green(`✓ Created openspec/schemas/${options.schema}/schema.yaml`));
        }

        // Copy schema templates if exist
        const templatesSrcDir = path.join(TEMPLATES_DIR, 'openspec', 'schemas', options.schema, 'templates');
        const templatesDestDir = path.join(openspecDir, 'schemas', options.schema, 'templates');

        if (await fs.pathExists(templatesSrcDir)) {
          await fs.copy(templatesSrcDir, templatesDestDir, { overwrite: options.force });
          console.log(chalk.green(`✓ Created openspec/schemas/${options.schema}/templates/`));
        }

        // Create .active file
        const activeFile = path.join(openspecDir, '.active');
        if (!await fs.exists(activeFile)) {
          await fs.writeFile(activeFile, '');
        }
      }

      // 2. Copy commands (only for platforms that support it)
      if (!options.skipCommands && platformConfig.commandsDir) {
        const commandsDir = path.join(cwd, platformConfig.commandsDir);
        await fs.ensureDir(commandsDir);

        const templateCommandsDir = path.join(TEMPLATES_DIR, 'opencode', 'commands');
        const commands = await fs.readdir(templateCommandsDir);

        let copiedCount = 0;
        for (const cmd of commands) {
          if (cmd.endsWith('.md')) {
            const src = path.join(templateCommandsDir, cmd);
            const dest = path.join(commandsDir, cmd);

            if (await fs.exists(dest) && !options.force) {
              console.log(chalk.gray(`  ${cmd} already exists, skipping`));
            } else {
              await fs.copy(src, dest);
              copiedCount++;
            }
          }
        }
        console.log(chalk.green(`✓ Copied ${copiedCount} command files to ${platformConfig.commandsDir}/`));
      }

      // 3. Copy skills (platform-specific)
      if (!options.skipSkills) {
        const skillsDir = path.join(cwd, platformConfig.skillsDir);
        await fs.ensureDir(skillsDir);

        const templateSkillsDir = path.join(TEMPLATES_DIR, 'opencode', 'skills');

        if (await fs.pathExists(templateSkillsDir)) {
          const skills = await fs.readdir(templateSkillsDir);
          let copiedSkills = 0;

          for (const skill of skills) {
            const skillSrcDir = path.join(templateSkillsDir, skill);
            const skillDestDir = path.join(skillsDir, skill);

            // Skip if not a directory
            const stat = await fs.stat(skillSrcDir);
            if (!stat.isDirectory()) continue;

            // Check if skill already exists
            if (await fs.exists(skillDestDir) && !options.force) {
              console.log(chalk.gray(`  ${skill}/ already exists, skipping`));
            } else {
              await fs.copy(skillSrcDir, skillDestDir, { overwrite: options.force });
              copiedSkills++;
            }
          }

          if (copiedSkills > 0) {
            console.log(chalk.green(`✓ Copied ${copiedSkills} skill packages to ${platformConfig.skillsDir}/`));
          }
        }
      }

      console.log('\n' + chalk.green.bold('✅ SDD workflow v2 initialized successfully!'));

      // Show mode-specific next steps
      if (options.schema === 'hybrid-workflow') {
        console.log('\n📚 Hybrid Workflow Commands (OpenCode):');
        console.log(chalk.cyan('   /hybrid-new <name>') + '        - Start hybrid workflow');
        console.log(chalk.cyan('   /hybrid-explore') + '           - Explore problem space');
        console.log(chalk.cyan('   /hybrid-ff') + '               - Fast-forward all docs');
        console.log(chalk.cyan('   /hybrid-apply') + '             - Execute with 3-Strike');
        console.log(chalk.cyan('   /hybrid-status') + '            - View status\n');
      } else {
        console.log('\n📚 Trinity Workflow v2 Commands:');
        console.log(chalk.cyan('   /trinity:new "描述"') + '      - 创建新变更（带追踪）');
        console.log(chalk.cyan('   /trinity:continue') + '        - 继续下一个 artifact');
        console.log(chalk.cyan('   /trinity:apply') + '           - 执行任务（3-Strike）');
        console.log(chalk.cyan('   /trinity:verify') + '          - 验证实现（三维度）');
        console.log(chalk.cyan('   /trinity:archive') + '         - 归档变更');
        console.log(chalk.cyan('   /trinity:ff "描述"') + '       - 快速流程\n');
      }

      // Platform-specific tips
      if (platform === 'claude') {
        console.log(chalk.gray('💡 Tips for Claude Code:'));
        console.log(chalk.gray('   - Skills are in .claude/skills/'));
        console.log(chalk.gray('   - Restart Claude Code to load new skills\n'));
      } else {
        console.log(chalk.gray('💡 Tips for OpenCode:'));
        console.log(chalk.gray('   - Skills are in .opencode/skills/'));
        console.log(chalk.gray('   - Commands are in .opencode/commands/'));
        console.log(chalk.gray('   - Requires oh-my-opencode plugin\n'));
      }

    } catch (error) {
      console.error(chalk.red('\n❌ Initialization failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List available commands and schemas')
  .action(() => {
    console.log(chalk.bold('\n📚 Trinity v2 Commands:'));
    console.log('   /trinity:new "描述"   - 创建新变更（带追踪）');
    console.log('   /trinity:continue    - 继续下一个 artifact');
    console.log('   /trinity:apply       - 执行任务（3-Strike）');
    console.log('   /trinity:verify      - 验证实现（三维度）');
    console.log('   /trinity:archive     - 归档变更');
    console.log('   /trinity:ff "描述"   - 快速流程');

    console.log(chalk.bold('\n📚 SDD Commands (Legacy - OpenCode):'));
    console.log('   /sdd-new       - Start a new SDD workflow');
    console.log('   /sdd-continue  - Continue to next artifact');
    console.log('   /sdd-apply     - Execute tasks from workflow');
    console.log('   /sdd-status    - View workflow status');

    console.log(chalk.bold('\n🔀 Hybrid Commands (OpenCode):'));
    console.log('   /hybrid-new      - Start hybrid workflow');
    console.log('   /hybrid-explore  - Explore problem space');
    console.log('   /hybrid-ff       - Fast-forward all docs');
    console.log('   /hybrid-continue - Continue to next artifact');
    console.log('   /hybrid-apply    - Execute with 3-Strike');
    console.log('   /hybrid-verify   - Verify implementation');
    console.log('   /hybrid-status   - View status');
    console.log('   /hybrid-archive  - Archive change');

    console.log(chalk.bold('\n📦 Available Schemas:'));
    console.log('   trinity-workflow-v2  - 三位一体架构工作流 v2 (推荐)');
    console.log('   trinity-workflow     - 三位一体架构工作流 v1');
    console.log('   hybrid-workflow      - 融合工作流');

    console.log(chalk.bold('\n🖥️ Supported Platforms:'));
    console.log('   claude   - Claude Code (.claude/skills/)');
    console.log('   opencode - OpenCode (.opencode/skills/)\n');
  });

program.parse();
