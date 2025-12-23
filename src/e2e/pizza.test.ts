import { ToolLoopAgent, type ToolSet, tool } from 'ai'
import { beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createRequesty } from '..'
import { getTestModels } from './get-models'

const requesty = createRequesty({
    apiKey: process.env.REQUESTY_API_KEY,
    baseURL: process.env.REQUESTY_BASE_URL,
})

const pizzaInventory = {
    dough: 10,
    tomatoSauce: 8,
    mozzarella: 12,
    pepperoni: 15,
    mushrooms: 7,
    olives: 5,
    basil: 20,
    parmesan: 6,
}

const pizzaOrders: Array<{
    id: string
    pizza: string
    toppings: string[]
    size: string
    status: string
    timestamp: number
}> = []

const systemPrompt = `You are an expert pizza maker managing a busy pizzeria. Your job is to:
1. Take and track pizza orders
2. Manage inventory of ingredients
3. Calculate preparation times
4. Provide pizza recommendations
5. Handle complex multi-topping orders
6. Check ingredient availability before accepting orders
7. Calculate pricing based on size and toppings

Always be friendly and professional. When orders cannot be fulfilled due to inventory, suggest alternatives.

Always prefer to do tool calls, even if the requirements are not completely clear.`

const tools = {
    checkInventory: tool({
        description:
            'Check the current inventory levels of all pizza ingredients',
        inputSchema: z.object({}),
        execute: async () => {
            return {
                inventory: pizzaInventory,
                lowStock: Object.entries(pizzaInventory)
                    .filter(([_, qty]) => qty < 5)
                    .map(([item]) => item),
            }
        },
    }),

    checkIngredient: tool({
        description:
            'Check if a specific ingredient is available and its quantity',
        inputSchema: z.object({
            ingredient: z.string().describe('The ingredient to check'),
        }),
        execute: async ({ ingredient }) => {
            const normalizedIngredient = ingredient
                .toLowerCase()
                .replace(/\s+/g, '')
            const key = Object.keys(pizzaInventory).find(
                (k) =>
                    k.toLowerCase().replace(/\s+/g, '') ===
                    normalizedIngredient,
            )

            if (!key) {
                return {
                    available: false,
                    message: `${ingredient} is not in our inventory`,
                }
            }

            const quantity = pizzaInventory[key as keyof typeof pizzaInventory]
            return {
                available: quantity > 0,
                quantity,
                ingredient: key,
            }
        },
    }),

    createOrder: tool({
        description:
            'Create a new pizza order with specified toppings and size',
        inputSchema: z.object({
            pizza: z
                .string()
                .describe(
                    'Type of pizza (e.g., Margherita, Pepperoni, Custom)',
                ),
            toppings: z
                .array(z.string())
                .describe('List of toppings for the pizza'),
            size: z
                .enum(['small', 'medium', 'large', 'xl'])
                .describe('Size of the pizza'),
        }),
        execute: async ({ pizza, toppings, size }) => {
            const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

            const requiredIngredients: Record<string, number> = {
                dough: 1,
                tomatoSauce: 1,
                mozzarella: 1,
            }

            for (const topping of toppings) {
                const normalizedTopping = topping
                    .toLowerCase()
                    .replace(/\s+/g, '')
                const key = Object.keys(pizzaInventory).find(
                    (k) =>
                        k.toLowerCase().replace(/\s+/g, '') ===
                        normalizedTopping,
                )
                if (key) {
                    requiredIngredients[key] =
                        (requiredIngredients[key] || 0) + 1
                }
            }

            for (const [ingredient, needed] of Object.entries(
                requiredIngredients,
            )) {
                const available =
                    pizzaInventory[ingredient as keyof typeof pizzaInventory]
                if (available < needed) {
                    return {
                        success: false,
                        message: `Insufficient ${ingredient}. Need ${needed}, have ${available}`,
                        orderId: null,
                    }
                }
            }

            for (const [ingredient, needed] of Object.entries(
                requiredIngredients,
            )) {
                pizzaInventory[ingredient as keyof typeof pizzaInventory] -=
                    needed
            }

            const order = {
                id: orderId,
                pizza,
                toppings,
                size,
                status: 'pending',
                timestamp: Date.now(),
            }
            pizzaOrders.push(order)

            return {
                success: true,
                orderId,
                message: `Order created successfully! Estimated prep time: ${toppings.length * 2 + 10} minutes`,
                order,
            }
        },
    }),

    calculatePrice: tool({
        description:
            'Calculate the total price for a pizza with given size and toppings',
        inputSchema: z.object({
            size: z
                .enum(['small', 'medium', 'large', 'xl'])
                .describe('Size of the pizza'),
            toppings: z.array(z.string()).describe('List of toppings'),
        }),
        execute: async ({ size, toppings }) => {
            const basePrices: Record<string, number> = {
                small: 8.99,
                medium: 12.99,
                large: 15.99,
                xl: 18.99,
            }

            const toppingPrice = 1.5
            const basePrice = basePrices[size] ?? 12.99
            const toppingsTotal = toppings.length * toppingPrice
            const subtotal = basePrice + toppingsTotal
            const tax = subtotal * 0.08
            const total = subtotal + tax

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
            }
        },
    }),

    getOrders: tool({
        description: 'Get all pizza orders or filter by status',
        inputSchema: z.object({
            status: z
                .enum(['all', 'pending', 'preparing', 'ready', 'delivered'])
                .optional(),
        }),
        execute: async ({ status }) => {
            if (!status || status === 'all') {
                return { orders: pizzaOrders, count: pizzaOrders.length }
            }
            const filtered = pizzaOrders.filter((o) => o.status === status)
            return { orders: filtered, count: filtered.length }
        },
    }),

    updateOrderStatus: tool({
        description: 'Update the status of a pizza order',
        inputSchema: z.object({
            orderId: z.string().describe('The order ID'),
            status: z.enum(['pending', 'preparing', 'ready', 'delivered']),
        }),
        execute: async ({ orderId, status }) => {
            const order = pizzaOrders.find((o) => o.id === orderId)
            if (!order) {
                return { success: false, message: 'Order not found' }
            }
            order.status = status
            return {
                success: true,
                message: `Order ${orderId} status updated to ${status}`,
                order,
            }
        },
    }),

    calculatePrepTime: tool({
        description: 'Calculate estimated preparation time for an order',
        inputSchema: z.object({
            toppings: z.array(z.string()).describe('List of toppings'),
            size: z.enum(['small', 'medium', 'large', 'xl']),
        }),
        execute: async ({ toppings, size }) => {
            const sizeMultiplier: Record<string, number> = {
                small: 1,
                medium: 1.2,
                large: 1.5,
                xl: 1.8,
            }

            const baseTime = 10
            const toppingTime = toppings.length * 2
            const sizeAdjustment =
                (baseTime + toppingTime) * (sizeMultiplier[size] ?? 1)
            const ovenTime = 12
            const totalMinutes = Math.ceil(sizeAdjustment + ovenTime)

            return {
                totalMinutes,
                breakdown: {
                    prep: Math.ceil(sizeAdjustment),
                    oven: ovenTime,
                },
                formatted: `${totalMinutes} minutes`,
            }
        },
    }),

    restockIngredient: tool({
        description: 'Restock a specific ingredient',
        inputSchema: z.object({
            ingredient: z.string().describe('The ingredient to restock'),
            quantity: z.number().min(1).describe('Amount to add'),
        }),
        execute: async ({ ingredient, quantity }) => {
            const normalizedIngredient = ingredient
                .toLowerCase()
                .replace(/\s+/g, '')
            const key = Object.keys(pizzaInventory).find(
                (k) =>
                    k.toLowerCase().replace(/\s+/g, '') ===
                    normalizedIngredient,
            )

            if (!key) {
                return {
                    success: false,
                    message: `${ingredient} is not a valid ingredient`,
                }
            }

            pizzaInventory[key as keyof typeof pizzaInventory] += quantity
            return {
                success: true,
                ingredient: key,
                newQuantity: pizzaInventory[key as keyof typeof pizzaInventory],
                message: `Restocked ${quantity} units of ${key}`,
            }
        },
    }),

    recommendPizza: tool({
        description: 'Recommend a pizza based on available ingredients',
        inputSchema: z.object({
            preference: z
                .enum(['vegetarian', 'meat-lover', 'classic', 'gourmet'])
                .optional(),
        }),
        execute: async ({ preference = 'classic' }) => {
            const recommendations: Record<
                string,
                { name: string; toppings: string[]; description: string }
            > = {
                vegetarian: {
                    name: 'Garden Supreme',
                    toppings: ['mushrooms', 'olives', 'basil'],
                    description: 'Fresh veggies on a classic base',
                },
                'meat-lover': {
                    name: 'Carnivore Special',
                    toppings: ['pepperoni', 'pepperoni', 'mozzarella'],
                    description: 'Double pepperoni for meat lovers',
                },
                classic: {
                    name: 'Margherita',
                    toppings: ['basil', 'mozzarella'],
                    description: 'Traditional Italian simplicity',
                },
                gourmet: {
                    name: 'Parmesan Delight',
                    toppings: ['parmesan', 'basil', 'olives'],
                    description: 'Elevated flavors for discerning palates',
                },
            }

            const rec = recommendations[preference]
            if (!rec) {
                return {
                    name: 'No recommendation',
                    toppings: [],
                    description: 'Invalid preference',
                    available: false,
                    message: 'Invalid preference type',
                }
            }
            const available = rec.toppings.every((t: string) => {
                const key = Object.keys(pizzaInventory).find(
                    (k) => k.toLowerCase() === t.toLowerCase(),
                )
                return (
                    key &&
                    pizzaInventory[key as keyof typeof pizzaInventory] > 0
                )
            })

            return {
                ...rec,
                available,
                message: available
                    ? 'All ingredients available!'
                    : 'Some ingredients low - may need substitution',
            }
        },
    }),

    getBusyHoursAnalysis: tool({
        description: 'Analyze order timestamps to identify busy hours',
        inputSchema: z.object({}),
        execute: async () => {
            if (pizzaOrders.length === 0) {
                return { message: 'No orders yet to analyze' }
            }

            const hourCounts: Record<number, number> = {}
            pizzaOrders.forEach((order) => {
                const hour = new Date(order.timestamp).getHours()
                hourCounts[hour] = (hourCounts[hour] || 0) + 1
            })

            const busiestHour = Object.entries(hourCounts).reduce((a, b) =>
                b[1] > a[1] ? b : a,
            )

            return {
                totalOrders: pizzaOrders.length,
                busiestHour: parseInt(busiestHour[0]),
                ordersInBusiestHour: busiestHour[1],
                hourlyBreakdown: hourCounts,
            }
        },
    }),
}

function resetInventoryAndOrders() {
    Object.assign(pizzaInventory, {
        dough: 10,
        tomatoSauce: 8,
        mozzarella: 12,
        pepperoni: 15,
        mushrooms: 7,
        olives: 5,
        basil: 20,
        parmesan: 6,
    })
    pizzaOrders.length = 0
}

const modelsToTest = getTestModels()

const testGenerateAgent = async <T extends ToolSet>(
    agent: ToolLoopAgent<T>,
    prompt: string,
) => {
    const { steps } = await agent.generate({
        prompt,
    })

    expect(steps.some((s) => s.toolCalls.length > 0)).toBeTruthy()
}

const testStreamAgent = async <T extends ToolSet>(
    agent: ToolLoopAgent<T>,
    prompt: string,
) => {
    const result = await agent.stream({
        prompt,
    })

    for await (const _chunk of result.textStream) {
        // Consume the stream
    }

    const steps = await result.steps
    expect(steps.length).toBeGreaterThan(0)
    expect(steps.some((s) => s.toolCalls.length > 0)).toBeTruthy()
}

describe.concurrent.each(modelsToTest)(
    'Pizza Agent Tests - $name',
    { timeout: 90_000 },
    ({ id }) => {
        let pizzaAgent: ToolLoopAgent<typeof tools>

        beforeAll(() => {
            resetInventoryAndOrders()
            pizzaAgent = new ToolLoopAgent({
                model: requesty.chat(id),
                instructions: systemPrompt,
                tools,
            }) as any
        })

        describe('agent.generate() tests', () => {
            it('should check ingredients in stock', async () => {
                await testGenerateAgent(
                    pizzaAgent,
                    'What ingredients do we have in stock?',
                )
            })

            it('should calculate price for large pepperoni pizza', async () => {
                await testGenerateAgent(
                    pizzaAgent,
                    'I want to order a large pepperoni pizza. How much will it cost?',
                )
            })

            it('should create order for medium pizza with toppings', async () => {
                await testGenerateAgent(
                    pizzaAgent,
                    'Create an order for a medium pizza with pepperoni, mushrooms, and olives.',
                )
            })

            it('should check basil availability', async () => {
                await testGenerateAgent(
                    pizzaAgent,
                    'Check if we have enough basil for 3 more orders',
                )
            })

            it('should recommend vegetarian pizza', async () => {
                await testGenerateAgent(
                    pizzaAgent,
                    'Recommend a vegetarian pizza for me',
                )
            })
        })

        describe('agent.stream() tests', () => {
            it('should stream price calculation and order creation', async () => {
                await testStreamAgent(
                    pizzaAgent,
                    'I want to order a large pepperoni pizza. Calculate the price and create the order.',
                )
            })

            it('should stream business analysis', async () => {
                await testStreamAgent(
                    pizzaAgent,
                    'Analyze our business: check inventory, count orders, and tell me our busiest hour',
                )
            })
        })
    },
)
