import { db } from "./db";
import { modules, quizzes, moduleSections, quizQuestions } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  // Check if modules already exist
  const existingModules = await db.select().from(modules);
  if (existingModules.length > 0) {
    console.log("Database already has modules. Skipping seed.");
    return;
  }

  // Create 3 initial modules
  const moduleData = [
    {
      title: "Modulo 1 - Introduzione",
      description: "Introduzione al corso di formazione. Questo modulo copre i concetti fondamentali e gli obiettivi del programma.",
      order: 1,
      published: true,
    },
    {
      title: "Modulo 2 - Approfondimento",
      description: "Approfondimento dei concetti chiave. In questo modulo esploreremo in dettaglio gli argomenti principali.",
      order: 2,
      published: true,
    },
    {
      title: "Modulo 3 - Applicazione Pratica",
      description: "Applicazione pratica delle conoscenze acquisite. Questo modulo finale ti guiderà attraverso esercizi pratici.",
      order: 3,
      published: true,
    },
  ];

  // Insert modules
  const insertedModules = await db.insert(modules).values(moduleData).returning();
  console.log(`Created ${insertedModules.length} modules`);

  // Create sections for each module
  for (const mod of insertedModules) {
    const sections = [
      {
        moduleId: mod.id,
        title: "Obiettivi di apprendimento",
        content: `<p>In questa sezione imparerai:</p>
<ul>
  <li>I concetti fondamentali del modulo</li>
  <li>Le competenze chiave da sviluppare</li>
  <li>Gli obiettivi pratici da raggiungere</li>
</ul>
<p>Prenditi il tempo necessario per assimilare ogni concetto prima di procedere alla sezione successiva.</p>`,
        order: 1,
      },
      {
        moduleId: mod.id,
        title: "Contenuto principale",
        content: `<p>Questa è la sezione principale del modulo dove troverai il contenuto formativo dettagliato.</p>
<h3>Punti chiave</h3>
<p>Il contenuto verrà aggiornato dall'amministratore con informazioni specifiche del corso.</p>
<blockquote>
  <p>"L'apprendimento è un processo continuo che richiede impegno e dedizione."</p>
</blockquote>`,
        order: 2,
      },
      {
        moduleId: mod.id,
        title: "Riepilogo e prossimi passi",
        content: `<p>Congratulazioni per aver completato questa sezione!</p>
<p><strong>Cosa hai imparato:</strong></p>
<ul>
  <li>I concetti fondamentali presentati nel modulo</li>
  <li>Le applicazioni pratiche delle nozioni apprese</li>
</ul>
<p>Ora sei pronto per il quiz di verifica. Assicurati di aver compreso tutti i concetti prima di procedere.</p>`,
        order: 3,
      },
    ];

    await db.insert(moduleSections).values(sections);
    console.log(`Created sections for module: ${mod.title}`);

    // Create quiz for module
    const [quiz] = await db.insert(quizzes).values({
      moduleId: mod.id,
      passingScore: 70,
    }).returning();

    // Create sample questions
    const questions = [
      {
        quizId: quiz.id,
        question: `Quale è l'obiettivo principale di ${mod.title}?`,
        options: [
          "Introdurre nuovi concetti",
          "Verificare le competenze acquisite",
          "Fornire materiale di riferimento",
          "Tutte le precedenti",
        ],
        correctOptionIndex: 3,
        order: 1,
      },
      {
        quizId: quiz.id,
        question: "Qual è il modo migliore per apprendere nuove competenze?",
        options: [
          "Leggere velocemente il materiale",
          "Praticare regolarmente",
          "Saltare le sezioni difficili",
          "Studiare solo prima degli esami",
        ],
        correctOptionIndex: 1,
        order: 2,
      },
      {
        quizId: quiz.id,
        question: "Cosa dovresti fare se incontri difficoltà con un argomento?",
        options: [
          "Ignorarlo e andare avanti",
          "Rileggere il materiale con attenzione",
          "Chiedere aiuto se necessario",
          "Sia B che C sono corrette",
        ],
        correctOptionIndex: 3,
        order: 3,
      },
      {
        quizId: quiz.id,
        question: "Perché è importante completare tutti i moduli in ordine?",
        options: [
          "Non è importante l'ordine",
          "I concetti sono costruiti progressivamente",
          "È solo una preferenza",
          "Per risparmiare tempo",
        ],
        correctOptionIndex: 1,
        order: 4,
      },
      {
        quizId: quiz.id,
        question: "Qual è la soglia minima per superare questo quiz?",
        options: [
          "50%",
          "60%",
          "70%",
          "80%",
        ],
        correctOptionIndex: 2,
        order: 5,
      },
    ];

    await db.insert(quizQuestions).values(questions);
    console.log(`Created quiz with ${questions.length} questions for module: ${mod.title}`);
  }

  console.log("Seed completed successfully!");
}

seed().catch(console.error);
