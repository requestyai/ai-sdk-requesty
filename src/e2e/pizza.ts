import { Experimental_Agent as Agent, tool } from "ai";
import { z } from "zod";
import { createRequesty } from "..";

const requesty = createRequesty({
    apiKey: process.env.REQUESTY_API_KEY,
    baseURL: process.env.REQUESTY_BASE_URL,
});

const pizzaInventory = {
    dough: 10,
    tomatoSauce: 8,
    mozzarella: 12,
    pepperoni: 15,
    mushrooms: 7,
    olives: 5,
    basil: 20,
    parmesan: 6,
};

const pizzaOrders: Array<{
    id: string;
    pizza: string;
    toppings: string[];
    size: string;
    status: string;
    timestamp: number;
}> = [];

const systemPrompt = `You are an expert pizza maker managing a busy pizzeria. Your job is to:
1. Take and track pizza orders
2. Manage inventory of ingredients
3. Calculate preparation times
4. Provide pizza recommendations
5. Handle complex multi-topping orders
6. Check ingredient availability before accepting orders
7. Calculate pricing based on size and toppings

Always be friendly and professional. When orders cannot be fulfilled due to inventory, suggest alternatives.`;

const tools = {
    checkInventory: tool({
        description: "Check the current inventory levels of all pizza ingredients",
        inputSchema: z.object({}),
        execute: async () => {
            return {
                inventory: pizzaInventory,
                lowStock: Object.entries(pizzaInventory)
                    .filter(([_, qty]) => qty < 5)
                    .map(([item]) => item),
            };
        },
    }),

    checkIngredient: tool({
        description: "Check if a specific ingredient is available and its quantity",
        inputSchema: z.object({
            ingredient: z.string().describe("The ingredient to check"),
        }),
        execute: async ({ ingredient }) => {
            const normalizedIngredient = ingredient.toLowerCase().replace(/\s+/g, "");
            const key = Object.keys(pizzaInventory).find(
                (k) => k.toLowerCase().replace(/\s+/g, "") === normalizedIngredient,
            );

            if (!key) {
                return {
                    available: false,
                    message: `${ingredient} is not in our inventory`,
                };
            }

            const quantity = pizzaInventory[key as keyof typeof pizzaInventory];
            return {
                available: quantity > 0,
                quantity,
                ingredient: key,
            };
        },
    }),

    createOrder: tool({
        description: "Create a new pizza order with specified toppings and size",
        inputSchema: z.object({
            pizza: z
                .string()
                .describe("Type of pizza (e.g., Margherita, Pepperoni, Custom)"),
            toppings: z.array(z.string()).describe("List of toppings for the pizza"),
            size: z
                .enum(["small", "medium", "large", "xl"])
                .describe("Size of the pizza"),
        }),
        execute: async ({ pizza, toppings, size }) => {
            const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const requiredIngredients: Record<string, number> = {
                dough: 1,
                tomatoSauce: 1,
                mozzarella: 1,
            };

            for (const topping of toppings) {
                const normalizedTopping = topping.toLowerCase().replace(/\s+/g, "");
                const key = Object.keys(pizzaInventory).find(
                    (k) => k.toLowerCase().replace(/\s+/g, "") === normalizedTopping,
                );
                if (key) {
                    requiredIngredients[key] = (requiredIngredients[key] || 0) + 1;
                }
            }

            for (const [ingredient, needed] of Object.entries(requiredIngredients)) {
                const available =
                    pizzaInventory[ingredient as keyof typeof pizzaInventory];
                if (available < needed) {
                    return {
                        success: false,
                        message: `Insufficient ${ingredient}. Need ${needed}, have ${available}`,
                        orderId: null,
                    };
                }
            }

            for (const [ingredient, needed] of Object.entries(requiredIngredients)) {
                pizzaInventory[ingredient as keyof typeof pizzaInventory] -= needed;
            }

            const order = {
                id: orderId,
                pizza,
                toppings,
                size,
                status: "pending",
                timestamp: Date.now(),
            };
            pizzaOrders.push(order);

            return {
                success: true,
                orderId,
                message: `Order created successfully! Estimated prep time: ${toppings.length * 2 + 10} minutes`,
                order,
            };
        },
    }),

    calculatePrice: tool({
        description:
            "Calculate the total price for a pizza with given size and toppings",
        inputSchema: z.object({
            size: z
                .enum(["small", "medium", "large", "xl"])
                .describe("Size of the pizza"),
            toppings: z.array(z.string()).describe("List of toppings"),
        }),
        execute: async ({ size, toppings }) => {
            const basePrices: Record<string, number> = {
                small: 8.99,
                medium: 12.99,
                large: 15.99,
                xl: 18.99,
            };

            const toppingPrice = 1.5;
            const basePrice = basePrices[size] ?? 12.99;
            const toppingsTotal = toppings.length * toppingPrice;
            const subtotal = basePrice + toppingsTotal;
            const tax = subtotal * 0.08;
            const total = subtotal + tax;

            return {
                breakdown: {
                    basePrice,
                    toppingsCount: toppings.length,
                    toppingsCost: toppingsTotal,
                    subtotal,
                    tax: parseFloat(tax.toFixed(2)),
                    total: parseFloat(total.toFixed(2)),
                },
                formatted: `$${total.toFixed(2)}`,
            };
        },
    }),

    getOrders: tool({
        description: "Get all pizza orders or filter by status",
        inputSchema: z.object({
            status: z
                .enum(["all", "pending", "preparing", "ready", "delivered"])
                .optional(),
        }),
        execute: async ({ status }) => {
            if (!status || status === "all") {
                return { orders: pizzaOrders, count: pizzaOrders.length };
            }
            const filtered = pizzaOrders.filter((o) => o.status === status);
            return { orders: filtered, count: filtered.length };
        },
    }),

    updateOrderStatus: tool({
        description: "Update the status of a pizza order",
        inputSchema: z.object({
            orderId: z.string().describe("The order ID"),
            status: z.enum(["pending", "preparing", "ready", "delivered"]),
        }),
        execute: async ({ orderId, status }) => {
            const order = pizzaOrders.find((o) => o.id === orderId);
            if (!order) {
                return { success: false, message: "Order not found" };
            }
            order.status = status;
            return {
                success: true,
                message: `Order ${orderId} status updated to ${status}`,
                order,
            };
        },
    }),

    calculatePrepTime: tool({
        description: "Calculate estimated preparation time for an order",
        inputSchema: z.object({
            toppings: z.array(z.string()).describe("List of toppings"),
            size: z.enum(["small", "medium", "large", "xl"]),
        }),
        execute: async ({ toppings, size }) => {
            const sizeMultiplier: Record<string, number> = {
                small: 1,
                medium: 1.2,
                large: 1.5,
                xl: 1.8,
            };

            const baseTime = 10;
            const toppingTime = toppings.length * 2;
            const sizeAdjustment =
                (baseTime + toppingTime) * (sizeMultiplier[size] ?? 1);
            const ovenTime = 12;
            const totalMinutes = Math.ceil(sizeAdjustment + ovenTime);

            return {
                totalMinutes,
                breakdown: {
                    prep: Math.ceil(sizeAdjustment),
                    oven: ovenTime,
                },
                formatted: `${totalMinutes} minutes`,
            };
        },
    }),

    restockIngredient: tool({
        description: "Restock a specific ingredient",
        inputSchema: z.object({
            ingredient: z.string().describe("The ingredient to restock"),
            quantity: z.number().positive().describe("Amount to add"),
        }),
        execute: async ({ ingredient, quantity }) => {
            const normalizedIngredient = ingredient.toLowerCase().replace(/\s+/g, "");
            const key = Object.keys(pizzaInventory).find(
                (k) => k.toLowerCase().replace(/\s+/g, "") === normalizedIngredient,
            );

            if (!key) {
                return {
                    success: false,
                    message: `${ingredient} is not a valid ingredient`,
                };
            }

            pizzaInventory[key as keyof typeof pizzaInventory] += quantity;
            return {
                success: true,
                ingredient: key,
                newQuantity: pizzaInventory[key as keyof typeof pizzaInventory],
                message: `Restocked ${quantity} units of ${key}`,
            };
        },
    }),

    recommendPizza: tool({
        description: "Recommend a pizza based on available ingredients",
        inputSchema: z.object({
            preference: z
                .enum(["vegetarian", "meat-lover", "classic", "gourmet"])
                .optional(),
        }),
        execute: async ({ preference = "classic" }) => {
            const recommendations: Record<
                string,
                { name: string; toppings: string[]; description: string }
            > = {
                vegetarian: {
                    name: "Garden Supreme",
                    toppings: ["mushrooms", "olives", "basil"],
                    description: "Fresh veggies on a classic base",
                },
                "meat-lover": {
                    name: "Carnivore Special",
                    toppings: ["pepperoni", "pepperoni", "mozzarella"],
                    description: "Double pepperoni for meat lovers",
                },
                classic: {
                    name: "Margherita",
                    toppings: ["basil", "mozzarella"],
                    description: "Traditional Italian simplicity",
                },
                gourmet: {
                    name: "Parmesan Delight",
                    toppings: ["parmesan", "basil", "olives"],
                    description: "Elevated flavors for discerning palates",
                },
            };

            const rec = recommendations[preference];
            if (!rec) {
                return {
                    name: "No recommendation",
                    toppings: [],
                    description: "Invalid preference",
                    available: false,
                    message: "Invalid preference type",
                };
            }
            const available = rec.toppings.every((t: string) => {
                const key = Object.keys(pizzaInventory).find(
                    (k) => k.toLowerCase() === t.toLowerCase(),
                );
                return key && pizzaInventory[key as keyof typeof pizzaInventory] > 0;
            });

            return {
                ...rec,
                available,
                message: available
                    ? "All ingredients available!"
                    : "Some ingredients low - may need substitution",
            };
        },
    }),

    getBusyHoursAnalysis: tool({
        description: "Analyze order timestamps to identify busy hours",
        inputSchema: z.object({}),
        execute: async () => {
            if (pizzaOrders.length === 0) {
                return { message: "No orders yet to analyze" };
            }

            const hourCounts: Record<number, number> = {};
            pizzaOrders.forEach((order) => {
                const hour = new Date(order.timestamp).getHours();
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            });

            const busiestHour = Object.entries(hourCounts).reduce((a, b) =>
                b[1] > a[1] ? b : a,
            );

            return {
                totalOrders: pizzaOrders.length,
                busiestHour: parseInt(busiestHour[0]),
                ordersInBusiestHour: busiestHour[1],
                hourlyBreakdown: hourCounts,
            };
        },
    }),
};

async function testModel(
    modelId: string,
    modelName: string,
): Promise<{ passed: number; failed: number }> {
    console.log("\n" + "█".repeat(80));
    console.log(`🤖 Testing Model: ${modelName} (${modelId})`);
    console.log("█".repeat(80));

    let passed = 0;
    let failed = 0;

    const pizzaAgent = new Agent({
        model: requesty.chat(modelId),
        system: systemPrompt,
        tools,
    });

    const testPrompts = [
        "What ingredients do we have in stock?",
        "I want to order a large pepperoni pizza. How much will it cost?",
        "Create an order for a medium pizza with pepperoni, mushrooms, and olives.",
        "Check if we have enough basil for 3 more orders",
        "Recommend a vegetarian pizza for me",
    ];

    const streamPrompts = [
        "Check inventory and recommend 2 pizzas I can make",
        "I want to order a large pepperoni pizza. Calculate the price and create the order.",
        "Analyze our business: check inventory, count orders, and tell me our busiest hour",
    ];

    console.log("\n" + "=".repeat(80));
    console.log("PART 1: Testing agent.generate() method");
    console.log("=".repeat(80));

    for (const [index, prompt] of testPrompts.entries()) {
        console.log(`\n${"=".repeat(80)}`);
        console.log(`Generate Test ${index + 1}/${testPrompts.length}: ${prompt}`);
        console.log("=".repeat(80));

        try {
            const { text, steps } = await pizzaAgent.generate({
                prompt,
            });

            console.log(`\n📝 Response: ${text}`);
            console.log(`\n🔧 Steps taken: ${steps.length}`);

            if (steps.length > 1) {
                console.log("   (Multi-step reasoning used)");
            }

            console.log("✅ Test passed");
            passed++;
        } catch (error) {
            console.error(
                `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
            );
            console.error("❌ Test failed");
            failed++;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log("\n\n" + "=".repeat(80));
    console.log("PART 2: Testing agent.stream() method");
    console.log("=".repeat(80));

    for (const [index, prompt] of streamPrompts.entries()) {
        console.log(`\n${"=".repeat(80)}`);
        console.log(`Stream Test ${index + 1}/${streamPrompts.length}: ${prompt}`);
        console.log("=".repeat(80));

        try {
            const result = pizzaAgent.stream({
                prompt,
            });

            let fullText = "";
            let chunkCount = 0;

            console.log("\n📡 Streaming response:");
            process.stdout.write("   ");

            for await (const chunk of result.textStream) {
                process.stdout.write(chunk);
                fullText += chunk;
                chunkCount++;
            }

            const finalResult = await result;
            const steps = await finalResult.steps;

            console.log(`\n\n📊 Stream stats:`);
            console.log(`   - Chunks received: ${chunkCount}`);
            console.log(`   - Total text length: ${fullText.length}`);
            console.log(`   - Steps taken: ${steps.length}`);

            if (steps.length > 1) {
                console.log("   - Multi-step reasoning used");
            }

            console.log("✅ Test passed");
            passed++;
        } catch (error) {
            console.error(
                `❌ Error: ${error instanceof Error ? error.message + "\n" + error.stack : String(error)}`,
            );
            console.error("❌ Test failed");
            failed++;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return { passed, failed };
}

async function main() {
    console.log("🍕 Pizza Maker Agent E2E Test - Multi-Model Testing\n");

    const models = [
        { id: "mistral/mistral-medium-latest", name: "Mistral medium latest" },
        // { id: "azure/openai/gpt-4.1-mini@francecentral", name: "Azure OpenAI GPT 4.1 Mini @francecentral" }
        // { id: "perplexity/sonar", name: "Perplexity Sonar" }
        // { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
        // { id: "anthropic/claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet" },
        // { id: "alibaba/qwen3-max-preview", name: "Qwen 3 Max" },
    ];

    let totalPassed = 0;
    let totalFailed = 0;
    const modelResults: Array<{
        name: string;
        passed: number;
        failed: number;
    }> = [];

    for (const model of models) {
        try {
            const { passed, failed } = await testModel(model.id, model.name);
            totalPassed += passed;
            totalFailed += failed;
            modelResults.push({ name: model.name, passed, failed });
        } catch (error) {
            console.error(
                `\n❌ Failed to test model ${model.name}:`,
                error instanceof Error ? error.message : String(error),
            );
            totalFailed += 8;
            modelResults.push({ name: model.name, passed: 0, failed: 8 });
        }

        console.log("\n" + "─".repeat(80));
        console.log("Resetting inventory and orders for next model...");
        console.log("─".repeat(80));

        Object.assign(pizzaInventory, {
            dough: 10,
            tomatoSauce: 8,
            mozzarella: 12,
            pepperoni: 15,
            mushrooms: 7,
            olives: 5,
            basil: 20,
            parmesan: 6,
        });
        pizzaOrders.length = 0;

        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("\n\n" + "█".repeat(80));
    console.log("📊 Test Summary");
    console.log("█".repeat(80));

    for (const result of modelResults) {
        const status = result.failed === 0 ? "✅" : "❌";
        console.log(
            `${status} ${result.name}: ${result.passed} passed, ${result.failed} failed`,
        );
    }

    console.log("\n" + "─".repeat(80));
    console.log(
        `Total: ${totalPassed} passed, ${totalFailed} failed (${totalPassed + totalFailed} total)`,
    );
    console.log("─".repeat(80));

    console.log("\n📊 Final State");
    console.log("Inventory:", pizzaInventory);
    console.log("Total Orders:", pizzaOrders.length);

    if (totalFailed > 0) {
        console.error(`\n❌ Tests failed with ${totalFailed} failures`);
        process.exit(1);
    } else {
        console.log("\n✅ All tests passed!");
        process.exit(0);
    }
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
