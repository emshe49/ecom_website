import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../modules/users/user.model.js';
import { Category } from '../modules/catalog/categories/category.model.js';
import { Brand } from '../modules/catalog/brands/brand.model.js';
import { Product } from '../modules/catalog/products/product.model.js';
import { ProductVariant } from '../modules/catalog/products/product-variant.model.js';
import { Inventory } from '../modules/inventory/inventory.model.js';
import { InventoryTransaction } from '../modules/inventory/inventory-transaction.model.js';
import {
  TRANSACTION_TYPE,
  REFERENCE_TYPE,
  DEFAULT_LOW_STOCK_THRESHOLD,
} from '../modules/inventory/inventory.constants.js';
import { logger } from '../shared/utils/logger.js';

import { hashPassword } from '../shared/security/password.service.js';
import { ROLES } from '../modules/authorization/roles.js';

function getAttributeSignature(attributes: Array<{ name: string; value: string }>): string {
  if (!attributes || attributes.length === 0) return 'default';
  return attributes
    .map((attr) => ({
      name: attr.name.trim().toLowerCase(),
      value: attr.value.trim().toLowerCase(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((attr) => `${attr.name}:${attr.value}`)
    .join('|');
}

export async function seedDemoStore(): Promise<void> {
  logger.info(`Connecting to database at: ${env.MONGODB_URI}`);
  await mongoose.connect(env.MONGODB_URI);

  try {
    const adminUser = await User.findOne({ role: 'SUPER_ADMIN' });
    const adminId = adminUser ? adminUser._id : null;

    // Seed/Ensure Demo Customer Account
    const customerEmail = 'customer@ecom.local';
    const customerPassword = 'Customer123!';
    const customerHash = await hashPassword(customerPassword);
    await User.findOneAndUpdate(
      { email: customerEmail },
      {
        firstName: 'John',
        lastName: 'Shopper',
        email: customerEmail,
        passwordHash: customerHash,
        role: ROLES.CUSTOMER,
        isEmailVerified: true,
        isActive: true,
      },
      { upsert: true, new: true }
    );
    logger.info(`Verified demo customer '${customerEmail}' ready.`);

    logger.info('Clearing existing catalog and inventory data...');
    await Promise.all([
      Category.deleteMany({}),
      Brand.deleteMany({}),
      Product.deleteMany({}),
      ProductVariant.deleteMany({}),
      Inventory.deleteMany({}),
      InventoryTransaction.deleteMany({}),
    ]);


    logger.info('Seeding Categories...');
    const categoriesData = [
      {
        name: 'Smartphones',
        slug: 'smartphones',
        description: 'Flagship and premium smartphones with next-gen processors and camera systems.',
        imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80',
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'Laptops & Computers',
        slug: 'laptops',
        description: 'High-performance notebooks, workstations, and ultra-portables.',
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80',
        isActive: true,
        sortOrder: 2,
      },
      {
        name: 'Audio & Headphones',
        slug: 'audio',
        description: 'Studio-grade noise canceling headphones, earbuds, and premium sound systems.',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
        isActive: true,
        sortOrder: 3,
      },
      {
        name: 'Smart Watches & Wearables',
        slug: 'wearables',
        description: 'Advanced fitness trackers, smartwatches, and connected wearable tech.',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
        isActive: true,
        sortOrder: 4,
      },
      {
        name: 'Accessories',
        slug: 'accessories',
        description: 'Chargers, cases, adapters, and accessories for all your devices.',
        imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&q=80',
        isActive: true,
        sortOrder: 5,
      },
    ];

    const createdCategories = await Category.insertMany(
      categoriesData.map((c) => ({ ...c, createdBy: adminId, updatedBy: adminId }))
    );
    const catMap = new Map(createdCategories.map((c) => [c.slug, c._id]));

    logger.info('Seeding Brands...');
    const brandsData = [
      {
        name: 'Apple',
        normalizedName: 'apple',
        slug: 'apple',
        description: 'Pioneering technology, iPhones, MacBooks, and premium digital experiences.',
        logoUrl: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=200&q=80',
        websiteUrl: 'https://www.apple.com',
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'Samsung',
        normalizedName: 'samsung',
        slug: 'samsung',
        description: 'Inspire the world with revolutionary mobile innovations and Galaxy devices.',
        logoUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=200&q=80',
        websiteUrl: 'https://www.samsung.com',
        isActive: true,
        sortOrder: 2,
      },
      {
        name: 'Sony',
        normalizedName: 'sony',
        slug: 'sony',
        description: 'Industry-leading audio performance, cameras, and entertainment technology.',
        logoUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=200&q=80',
        websiteUrl: 'https://www.sony.com',
        isActive: true,
        sortOrder: 3,
      },
      {
        name: 'Dell',
        normalizedName: 'dell',
        slug: 'dell',
        description: 'Powerful laptops, workstations, and computing hardware for professionals.',
        logoUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=200&q=80',
        websiteUrl: 'https://www.dell.com',
        isActive: true,
        sortOrder: 4,
      },
      {
        name: 'Bose',
        normalizedName: 'bose',
        slug: 'bose',
        description: 'Legendary sound, acoustic noise cancellation, and sound innovation.',
        logoUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=200&q=80',
        websiteUrl: 'https://www.bose.com',
        isActive: true,
        sortOrder: 5,
      },
    ];

    const createdBrands = await Brand.insertMany(
      brandsData.map((b) => ({ ...b, createdBy: adminId, updatedBy: adminId }))
    );
    const brandMap = new Map(createdBrands.map((b) => [b.slug, b._id]));

    logger.info('Seeding Products, Multi-Variant SKUs, and Inventory...');

    const demoProducts = [
      {
        product: {
          name: 'iPhone 15 Pro Max',
          slug: 'iphone-15-pro-max',
          shortDescription: 'Forged in titanium with the ground-breaking A17 Pro chip and 48MP camera.',
          description:
            'iPhone 15 Pro Max is the first iPhone to feature an aerospace-grade titanium design, using the same alloy that spacecraft use for missions to Mars. The A17 Pro chip brings a whole new class of gaming and graphic performance.',
          categoryId: catMap.get('smartphones'),
          brandId: brandMap.get('apple'),
          status: 'ACTIVE',
          featured: true,
          tags: ['smartphone', 'apple', 'ios', '5g', 'flagship', 'titanium'],
          images: [
            {
              url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
              altText: 'iPhone 15 Pro Max Titanium',
              sortOrder: 0,
              isPrimary: true,
            },
            {
              url: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?w=800&q=80',
              altText: 'iPhone 15 Pro Front and Back',
              sortOrder: 1,
              isPrimary: false,
            },
          ],
          attributes: [
            { name: 'Display', value: '6.7-inch Super Retina XDR' },
            { name: 'Processor', value: 'A17 Pro Bionic' },
            { name: 'Camera', value: '48MP Main + 5x Telephoto' },
          ],
        },
        variants: [
          {
            sku: 'IP15PM-NAT-256',
            name: 'Natural Titanium / 256GB',
            attributes: [
              { name: 'Color', value: 'Natural Titanium' },
              { name: 'Storage', value: '256GB' },
            ],
            price: 389999,
            compareAtPrice: 409999,
            costPrice: 340000,
            imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
            stock: 35, // IN_STOCK
          },
          {
            sku: 'IP15PM-BLU-512',
            name: 'Blue Titanium / 512GB',
            attributes: [
              { name: 'Color', value: 'Blue Titanium' },
              { name: 'Storage', value: '512GB' },
            ],
            price: 439999,
            compareAtPrice: 459999,
            costPrice: 380000,
            imageUrl: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?w=800&q=80',
            stock: 3, // LOW_STOCK (threshold is 5)
          },
          {
            sku: 'IP15PM-WHT-1TB',
            name: 'White Titanium / 1TB',
            attributes: [
              { name: 'Color', value: 'White Titanium' },
              { name: 'Storage', value: '1TB' },
            ],
            price: 499999,
            compareAtPrice: 519999,
            costPrice: 420000,
            imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
            stock: 0, // OUT_OF_STOCK
          },
        ],
      },
      {
        product: {
          name: 'Samsung Galaxy S24 Ultra',
          slug: 'samsung-galaxy-s24-ultra',
          shortDescription: 'Galaxy AI is here. Epic titanium frame, 200MP camera, and built-in S Pen.',
          description:
            'Meet Galaxy S24 Ultra, the ultimate form of Galaxy Ultra with a new titanium exterior and a 6.8-inch flat display. Powered by Galaxy AI to unleash whole new levels of creativity, productivity and possibility.',
          categoryId: catMap.get('smartphones'),
          brandId: brandMap.get('samsung'),
          status: 'ACTIVE',
          featured: true,
          tags: ['smartphone', 'samsung', 'galaxy', 'android', 'ai', 'spen'],
          images: [
            {
              url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80',
              altText: 'Galaxy S24 Ultra',
              sortOrder: 0,
              isPrimary: true,
            },
          ],
          attributes: [
            { name: 'Display', value: '6.8-inch Dynamic AMOLED 2X' },
            { name: 'Processor', value: 'Snapdragon 8 Gen 3' },
            { name: 'Camera', value: '200MP Quad Tele' },
          ],
        },
        variants: [
          {
            sku: 'S24U-GRY-256',
            name: 'Titanium Gray / 256GB',
            attributes: [
              { name: 'Color', value: 'Titanium Gray' },
              { name: 'Storage', value: '256GB' },
            ],
            price: 349999,
            compareAtPrice: 369999,
            costPrice: 300000,
            stock: 22,
          },
          {
            sku: 'S24U-BLK-512',
            name: 'Titanium Black / 512GB',
            attributes: [
              { name: 'Color', value: 'Titanium Black' },
              { name: 'Storage', value: '512GB' },
            ],
            price: 399999,
            compareAtPrice: 419999,
            costPrice: 340000,
            stock: 2, // LOW_STOCK
          },
        ],
      },
      {
        product: {
          name: 'MacBook Pro 16" (M3 Max)',
          slug: 'macbook-pro-16-m3-max',
          shortDescription: 'Unrivaled pro performance with M3 Max, Liquid Retina XDR, and up to 22 hrs battery.',
          description:
            'MacBook Pro blasts forward with the M3 Max chip, an insanely advanced chip that powers massive workflows and hardware-accelerated ray tracing. Featuring a stunning Liquid Retina XDR display.',
          categoryId: catMap.get('laptops'),
          brandId: brandMap.get('apple'),
          status: 'ACTIVE',
          featured: true,
          tags: ['laptop', 'apple', 'macbook', 'm3max', 'pro', 'workstation'],
          images: [
            {
              url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
              altText: 'MacBook Pro 16 Space Black',
              sortOrder: 0,
              isPrimary: true,
            },
          ],
          attributes: [
            { name: 'Display', value: '16.2-inch Liquid Retina XDR' },
            { name: 'Processor', value: 'Apple M3 Max (16-core CPU, 40-core GPU)' },
          ],
        },
        variants: [
          {
            sku: 'MBP16-M3M-36GB',
            name: 'Space Black / 36GB / 512GB',
            attributes: [
              { name: 'Color', value: 'Space Black' },
              { name: 'Memory', value: '36GB Unified' },
              { name: 'Storage', value: '512GB SSD' },
            ],
            price: 789999,
            compareAtPrice: 829999,
            costPrice: 700000,
            stock: 14,
          },
          {
            sku: 'MBP16-M3M-48GB',
            name: 'Silver / 48GB / 1TB',
            attributes: [
              { name: 'Color', value: 'Silver' },
              { name: 'Memory', value: '48GB Unified' },
              { name: 'Storage', value: '1TB SSD' },
            ],
            price: 949999,
            compareAtPrice: 999999,
            costPrice: 850000,
            stock: 6,
          },
        ],
      },
      {
        product: {
          name: 'Dell XPS 15 OLED',
          slug: 'dell-xps-15-oled',
          shortDescription: 'InfinityEdge 3.5K OLED touchscreen with 13th Gen Intel Core and NVIDIA RTX 4060.',
          description:
            'The XPS 15 is the perfect balance of power and portability with an immersive 3.5K OLED touch display and stellar audio performance encased in machined aluminum.',
          categoryId: catMap.get('laptops'),
          brandId: brandMap.get('dell'),
          status: 'ACTIVE',
          featured: false,
          tags: ['laptop', 'dell', 'xps', 'windows', 'oled', 'rtx4060'],
          images: [
            {
              url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80',
              altText: 'Dell XPS 15',
              sortOrder: 0,
              isPrimary: true,
            },
          ],
          attributes: [
            { name: 'Display', value: '15.6-inch 3.5K OLED Touch' },
            { name: 'Graphics', value: 'NVIDIA GeForce RTX 4060' },
          ],
        },
        variants: [
          {
            sku: 'DELL-XPS15-I7',
            name: 'Intel Core i7 / 16GB / 512GB',
            attributes: [
              { name: 'Processor', value: 'Core i7-13700H' },
              { name: 'RAM', value: '16GB DDR5' },
            ],
            price: 459999,
            compareAtPrice: 489999,
            costPrice: 400000,
            stock: 9,
          },
          {
            sku: 'DELL-XPS15-I9',
            name: 'Intel Core i9 / 32GB / 1TB',
            attributes: [
              { name: 'Processor', value: 'Core i9-13900H' },
              { name: 'RAM', value: '32GB DDR5' },
            ],
            price: 589999,
            compareAtPrice: 629999,
            costPrice: 510000,
            stock: 0, // OUT_OF_STOCK
          },
        ],
      },
      {
        product: {
          name: 'Sony WH-1000XM5 Wireless Headphones',
          slug: 'sony-wh-1000xm5',
          shortDescription: 'Industry-leading noise canceling with two processors and 8 microphones.',
          description:
            'The WH-1000XM5 headphones rewrite the rules for distraction-free listening. With two processors controlling 8 microphones and an Auto NC Optimizer, experience unmatched acoustic clarity and 30-hour battery life.',
          categoryId: catMap.get('audio'),
          brandId: brandMap.get('sony'),
          status: 'ACTIVE',
          featured: true,
          tags: ['audio', 'sony', 'headphones', 'anc', 'wireless', 'bluetooth'],
          images: [
            {
              url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
              altText: 'Sony WH-1000XM5 Headphones',
              sortOrder: 0,
              isPrimary: true,
            },
          ],
          attributes: [
            { name: 'Battery', value: 'Up to 30 hours' },
            { name: 'Noise Canceling', value: 'Integrated Processor V1 + QN1' },
          ],
        },
        variants: [
          {
            sku: 'SONY-XM5-BLK',
            name: 'Midnight Black',
            attributes: [{ name: 'Color', value: 'Midnight Black' }],
            price: 89999,
            compareAtPrice: 99999,
            costPrice: 72000,
            stock: 45,
          },
          {
            sku: 'SONY-XM5-SLV',
            name: 'Platinum Silver',
            attributes: [{ name: 'Color', value: 'Platinum Silver' }],
            price: 89999,
            compareAtPrice: 99999,
            costPrice: 72000,
            stock: 4, // LOW_STOCK
          },
        ],
      },
      {
        product: {
          name: 'Bose QuietComfort Ultra Headphones',
          slug: 'bose-quietcomfort-ultra',
          shortDescription: 'World-class noise cancellation, breakthrough spatialized audio, and luxury design.',
          description:
            'QuietComfort Ultra Headphones push the boundaries of what it means to listen. Immersive Audio spatializes acoustic fidelity right in front of you while CustomTune technology customizes sound to the shape of your ears.',
          categoryId: catMap.get('audio'),
          brandId: brandMap.get('bose'),
          status: 'ACTIVE',
          featured: false,
          tags: ['audio', 'bose', 'headphones', 'spatial-audio', 'anc'],
          images: [
            {
              url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80',
              altText: 'Bose QuietComfort Ultra',
              sortOrder: 0,
              isPrimary: true,
            },
          ],
          attributes: [
            { name: 'Modes', value: 'Quiet, Aware, Immersion' },
            { name: 'Battery', value: 'Up to 24 hours' },
          ],
        },
        variants: [
          {
            sku: 'BOSE-QCU-BLK',
            name: 'Black',
            attributes: [{ name: 'Color', value: 'Black' }],
            price: 94999,
            compareAtPrice: 104999,
            costPrice: 78000,
            stock: 20,
          },
          {
            sku: 'BOSE-QCU-WHT',
            name: 'White Smoke',
            attributes: [{ name: 'Color', value: 'White Smoke' }],
            price: 94999,
            compareAtPrice: 104999,
            costPrice: 78000,
            stock: 15,
          },
        ],
      },
      {
        product: {
          name: 'Apple Watch Series 9',
          slug: 'apple-watch-series-9',
          shortDescription: 'Smarter. Brighter. Mightier. Featuring S9 SiP and revolutionary Double Tap gesture.',
          description:
            'Apple Watch Series 9 helps you stay connected, active, healthy, and safe. Featuring the Double Tap gesture, an even brighter Always-On Retina display, and advanced health sensors.',
          categoryId: catMap.get('wearables'),
          brandId: brandMap.get('apple'),
          status: 'ACTIVE',
          featured: true,
          tags: ['wearable', 'apple', 'watch', 'fitness', 'smartwatch'],
          images: [
            {
              url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
              altText: 'Apple Watch Series 9',
              sortOrder: 0,
              isPrimary: true,
            },
          ],
          attributes: [
            { name: 'Display', value: '2000 nits Always-On Retina' },
            { name: 'Chip', value: 'S9 SiP with 4-core Neural Engine' },
          ],
        },
        variants: [
          {
            sku: 'AW9-41-MID',
            name: '41mm / Midnight Sport Band',
            attributes: [
              { name: 'Case Size', value: '41mm' },
              { name: 'Band Color', value: 'Midnight' },
            ],
            price: 119999,
            compareAtPrice: 129999,
            costPrice: 95000,
            stock: 25,
          },
          {
            sku: 'AW9-45-STR',
            name: '45mm / Starlight Sport Band',
            attributes: [
              { name: 'Case Size', value: '45mm' },
              { name: 'Band Color', value: 'Starlight' },
            ],
            price: 129999,
            compareAtPrice: 139999,
            costPrice: 105000,
            stock: 1, // LOW_STOCK
          },
        ],
      },
    ];

    let totalProducts = 0;
    let totalVariants = 0;
    let totalStock = 0;

    for (const pData of demoProducts) {
      const product = await Product.create({
        ...pData.product,
        createdBy: adminId,
        updatedBy: adminId,
        publishedAt: new Date(),
      });
      totalProducts++;

      for (const vData of pData.variants) {
        const attributeSignature = getAttributeSignature(vData.attributes);
        const variant = await ProductVariant.create({
          productId: product._id,
          sku: vData.sku,
          name: vData.name,
          attributes: vData.attributes,
          attributeSignature,
          price: vData.price,
          compareAtPrice: vData.compareAtPrice,
          costPrice: vData.costPrice,
          imageUrl: vData.imageUrl || pData.product.images[0]?.url,
          dimensions: { lengthCm: 15, widthCm: 8, heightCm: 1 },
          weightGrams: 200,
          isActive: true,
          createdBy: adminId,
          updatedBy: adminId,
        });
        totalVariants++;

        // Initialize Inventory
        await Inventory.create({
          variantId: variant._id,
          onHand: vData.stock,
          reserved: 0,
          lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
        });


        // If stock > 0, create an audit transaction
        if (vData.stock > 0) {
          await InventoryTransaction.create({
            variantId: variant._id,
            type: TRANSACTION_TYPE.STOCK_IN,
            quantity: vData.stock,
            previousOnHand: 0,
            newOnHand: vData.stock,
            previousReserved: 0,
            newReserved: 0,
            reason: 'Initial warehouse shipment receipt',
            referenceType: REFERENCE_TYPE.PURCHASE_ORDER,
            referenceId: 'PO-INITIAL-001',
            createdBy: adminId,
          });
          totalStock += vData.stock;
        }
      }
    }

    logger.info(`Demo store seed complete! Created:
      - ${createdCategories.length} Categories
      - ${createdBrands.length} Brands
      - ${totalProducts} Products
      - ${totalVariants} Variants
      - ${totalStock} Total In-Stock Units`);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Seed failed: ${errMessage}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('Database disconnected cleanly.');
  }
}

// Direct execution
if (process.argv[1] && process.argv[1].endsWith('seed-demo-store.ts')) {
  seedDemoStore();
}
