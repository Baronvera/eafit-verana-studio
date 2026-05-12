import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AgentsService } from './agents/agents.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const agentsService = app.get(AgentsService);

  const userId = "8b5070d1-9f5c-4942-959f-2e23435c3ce3";
  const dto = {
    name: "Test Agent " + Date.now(),
    organization: {
      name: "Test Org",
      country: "Colombia"
    },
    llmProvider: "openai",
    model: "gpt-4o-mini",
    prompt: "Test prompt",
    service: {
      termsUrl: "http://example.com/terms",
      privacyUrl: "http://example.com/privacy"
    }
  };

  console.log('Creating agent...');
  try {
    const result = await agentsService.create(userId, dto as any);
    console.log('Create result:', result);
    
    // Wait for provisioning to progress
    console.log('Waiting for provisioning steps...');
    for (let i = 0; i < 20; i++) {
      const steps = agentsService.getProvisioningSteps(result.agentId);
      console.log(`Step count: ${steps.length}`);
      if (steps.length > 0) {
        console.log('Latest step:', steps[steps.length - 1]);
      }
      await new Promise(r => setTimeout(r, 5000));
    }
  } catch (err) {
    console.error('Error creating agent:', err);
  } finally {
    await app.close();
  }
}

main();
