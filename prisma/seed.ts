import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Semeando banco de dados...');

  // Limpar dados existentes
  await prisma.alert.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.user.deleteMany();

  // Criar usuários
  const senha = await bcrypt.hash('Agro@2024', 10);

  const joao = await prisma.user.create({
    data: {
      email: 'joao.silva@agrosolar.com.br',
      passwordHash: senha,
      displayName: 'João Carlos Silva',
    },
  });

  const maria = await prisma.user.create({
    data: {
      email: 'maria.santos@verdecampo.com.br',
      passwordHash: senha,
      displayName: 'Maria Aparecida Santos',
    },
  });

  const pedro = await prisma.user.create({
    data: {
      email: 'pedro.oliveira@fazendasol.com.br',
      passwordHash: senha,
      displayName: 'Pedro Henrique Oliveira',
    },
  });

  // Fazendas do João (Minas Gerais / São Paulo)
  const solNascente = await prisma.farm.create({
    data: {
      userId: joao.id,
      name: 'Fazenda Sol Nascente',
      latitude: -21.1767,
      longitude: -44.9981,
      altitudeMeters: 920,
      cropType: 'café arábica',
      soilType: 'latossolo vermelho-escuro',
      areaHectares: 85.0,
      irrigationEfficiency: 0.91,
      solarPanelCapacityW: 12000,
      pumpPowerW: 5500,
      tiltDegrees: 22,
      azimuthDegrees: 0,
      performanceRatio: 0.81,
      iotDeviceId: 'IOT-MG-SN-001',
    },
  });

  const aguasClaras = await prisma.farm.create({
    data: {
      userId: joao.id,
      name: 'Sítio Águas Claras',
      latitude: -22.2176,
      longitude: -49.9453,
      altitudeMeters: 520,
      cropType: 'laranja pêra',
      soilType: 'argissolo vermelho-amarelo',
      areaHectares: 32.5,
      irrigationEfficiency: 0.87,
      solarPanelCapacityW: 6000,
      pumpPowerW: 3000,
      tiltDegrees: 18,
      azimuthDegrees: 355,
      performanceRatio: 0.79,
      iotDeviceId: 'IOT-SP-AC-002',
    },
  });

  // Fazendas da Maria (Bahia / Goiás)
  const serraDourada = await prisma.farm.create({
    data: {
      userId: maria.id,
      name: 'Fazenda Serra Dourada',
      latitude: -12.9714,
      longitude: -38.5124,
      altitudeMeters: 45,
      cropType: 'cacau',
      soilType: 'cambissolo háplico',
      areaHectares: 120.0,
      irrigationEfficiency: 0.83,
      solarPanelCapacityW: 15000,
      pumpPowerW: 7500,
      tiltDegrees: 12,
      azimuthDegrees: 0,
      performanceRatio: 0.84,
      iotDeviceId: 'IOT-BA-SD-001',
    },
  });

  const cerradoVerde = await prisma.farm.create({
    data: {
      userId: maria.id,
      name: 'Fazenda Cerrado Verde',
      latitude: -15.9398,
      longitude: -49.2543,
      altitudeMeters: 640,
      cropType: 'soja',
      soilType: 'latossolo vermelho',
      areaHectares: 250.0,
      irrigationEfficiency: 0.92,
      solarPanelCapacityW: 25000,
      pumpPowerW: 12000,
      tiltDegrees: 16,
      azimuthDegrees: 5,
      performanceRatio: 0.80,
      iotDeviceId: 'IOT-GO-CV-001',
    },
  });

  const rioBonito = await prisma.farm.create({
    data: {
      userId: maria.id,
      name: 'Sítio Rio Bonito',
      latitude: -14.7954,
      longitude: -39.0513,
      altitudeMeters: 210,
      cropType: 'mandioca',
      soilType: 'neossolo quartzarênico',
      areaHectares: 18.0,
      irrigationEfficiency: 0.78,
      solarPanelCapacityW: 3500,
      pumpPowerW: 1800,
      tiltDegrees: 14,
      azimuthDegrees: 350,
      performanceRatio: 0.76,
      iotDeviceId: 'IOT-BA-RB-002',
    },
  });

  // Fazendas do Pedro (Rio Grande do Sul / Paraná)
  const pampasSolar = await prisma.farm.create({
    data: {
      userId: pedro.id,
      name: 'Estância Pampas Solar',
      latitude: -30.0346,
      longitude: -51.2177,
      altitudeMeters: 10,
      cropType: 'arroz irrigado',
      soilType: 'planossolo háplico',
      areaHectares: 180.0,
      irrigationEfficiency: 0.94,
      solarPanelCapacityW: 20000,
      pumpPowerW: 9000,
      tiltDegrees: 28,
      azimuthDegrees: 0,
      performanceRatio: 0.77,
      iotDeviceId: 'IOT-RS-PS-001',
    },
  });

  const mateVerde = await prisma.farm.create({
    data: {
      userId: pedro.id,
      name: 'Fazenda Mate Verde',
      latitude: -25.4284,
      longitude: -49.2733,
      altitudeMeters: 934,
      cropType: 'erva-mate',
      soilType: 'cambissolo húmico',
      areaHectares: 55.0,
      irrigationEfficiency: 0.86,
      solarPanelCapacityW: 8500,
      pumpPowerW: 4000,
      tiltDegrees: 25,
      azimuthDegrees: 10,
      performanceRatio: 0.79,
      iotDeviceId: 'IOT-PR-MV-001',
    },
  });

  // Alertas para as fazendas
  await prisma.alert.createMany({
    data: [
      // Sol Nascente
      { farmId: solNascente.id, severity: 'high', message: 'Pressão da bomba principal acima de 8 bar — risco de ruptura' },
      { farmId: solNascente.id, severity: 'medium', message: 'Produção solar 25% abaixo do esperado — verificar painéis' },
      { farmId: solNascente.id, severity: 'low', message: 'Sensor de temperatura ambiente com variação atípica' },

      // Águas Claras
      { farmId: aguasClaras.id, severity: 'high', message: 'Vazamento detectado no setor 3 — gotejamento irregular' },
      { farmId: aguasClaras.id, severity: 'medium', message: 'Bateria do dispositivo IoT abaixo de 20%' },

      // Serra Dourada
      { farmId: serraDourada.id, severity: 'high', message: 'Falha na comunicação com inversor solar há 2 horas' },
      { farmId: serraDourada.id, severity: 'medium', message: 'Umidade do solo no talhão 7 abaixo do mínimo para cacau' },
      { farmId: serraDourada.id, severity: 'low', message: 'Agendamento de manutenção preventiva em 3 dias' },
      { farmId: serraDourada.id, severity: 'low', message: 'Atualização de firmware disponível para controlador IOT-BA-SD-001', acknowledged: true },

      // Cerrado Verde
      { farmId: cerradoVerde.id, severity: 'high', message: 'Consumo de energia 40% acima do normal — possível obstrução na bomba' },
      { farmId: cerradoVerde.id, severity: 'medium', message: 'Previsão de nebulosidade intensa para as próximas 48h — reservar energia' },

      // Rio Bonito
      { farmId: rioBonito.id, severity: 'medium', message: 'Eficiência de irrigação caiu para 65% — verificar filtros' },

      // Pampas Solar
      { farmId: pampasSolar.id, severity: 'high', message: 'Nível do reservatório principal abaixo de 15% — irrigação comprometida' },
      { farmId: pampasSolar.id, severity: 'high', message: 'Sobrecarga no sistema elétrico — disjuntor acionado automaticamente' },
      { farmId: pampasSolar.id, severity: 'medium', message: 'Degradação de 12% detectada no painel solar módulo A3' },
      { farmId: pampasSolar.id, severity: 'low', message: 'Temperatura interna do inversor levemente elevada', acknowledged: true },

      // Mate Verde
      { farmId: mateVerde.id, severity: 'medium', message: 'Sensor de radiação solar com leitura inconsistente no setor norte' },
      { farmId: mateVerde.id, severity: 'low', message: 'Próxima calibração dos sensores programada para 15/07' },
    ],
  });

  const userCount = await prisma.user.count();
  const farmCount = await prisma.farm.count();
  const alertCount = await prisma.alert.count();

  console.log(`✅ Seed concluído:`);
  console.log(`   - ${userCount} usuários`);
  console.log(`   - ${farmCount} fazendas`);
  console.log(`   - ${alertCount} alertas`);
  console.log(`\n📧 Credenciais de acesso (todos os usuários):`);
  console.log(`   Senha: Agro@2024`);
  console.log(`   Emails:`);
  console.log(`     - joao.silva@agrosolar.com.br`);
  console.log(`     - maria.santos@verdecampo.com.br`);
  console.log(`     - pedro.oliveira@fazendasol.com.br`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao semear banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
