// =============================================================================
// E-Commerce Checkout Flow Monitor - Test Engine
// Daily automated test for slumberland.com.my & vono.com.my
// Tests: Homepage → Product → Add to Cart → Cart → Checkout → STOP before iPay88
// =============================================================================

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// --- Site Configuration ------------------------------------------------------
const SITES = [
  {
    name: 'Slumberland',
    baseUrl: 'https://slumberland.com.my',
    testProductUrl: 'https://slumberland.com.my/product/cambridge/',
    cartUrl: 'https://slumberland.com.my/cart/',
    checkoutUrl: 'https://slumberland.com.my/checkout/',
  },
  {
    name: 'Vono',
    baseUrl: 'https://vono.com.my',
    testProductUrl: 'https://vono.com.my/product/durable-dream/',
    cartUrl: 'https://vono.com.my/cart/',
    checkoutUrl: 'https://vono.com.my/checkout/',
  },
];

const TEST_CUSTOMER = {
  firstName: 'Test',
  lastName: 'Monitor',
  email: 'testmonitor@example.com',
  phone: '0123456789',
  address1: '123 Test Street',
  city: 'Kuala Lumpur',
  postcode: '50000',
};

const RESULTS_DIR = path.join(__dirname, '..', 'data');
const SCREENSHOTS_DIR = path.join(RESULTS_DIR, 'screenshots');

// Ensure directories exist
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// --- Helper: Select WooCommerce product variations ---------------------------
async function selectVariations(page) {
  const variationSelects = await page.locator('select[name^="attribute_"]').all();
  for (const dropdown of variationSelects) {
    if (await dropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      const options = await dropdown.locator('option').all();
      for (const option of options) {
        const value = await option.getAttribute('value');
        if (value && value !== '') {
          await dropdown.selectOption(value);
          await page.waitForTimeout(1500);
          return value;
        }
      }
    }
  }
  return null;
}

// --- Helper: Click Add to Cart -----------------------------------------------
async function clickAddToCart(page) {
  const addToCartBtn = page.locator([
    'button.single_add_to_cart_button',
    '.add_to_cart_button',
    '[name="add-to-cart"]',
    'button:has-text("Add to cart")',
    'button:has-text("Add to Cart")',
  ].join(', '));
  await addToCartBtn.first().click();
}

// --- Helper: Take screenshot -------------------------------------------------
async function takeScreenshot(page, siteName, stepName, status) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${siteName}-${stepName}-${status}-${timestamp}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filename;
}

// --- Run all steps for one site ----------------------------------------------
async function testSite(site) {
  const result = {
    site: site.name,
    url: site.baseUrl,
    timestamp: new Date().toISOString(),
    steps: [],
    overallStatus: 'passed',
    duration: 0,
  };

  const startTime = Date.now();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  const steps = [
    // STEP 1: Homepage
    {
      name: 'Homepage Load',
      run: async () => {
        const response = await page.goto(site.baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (response.status() >= 400) throw new Error(`HTTP ${response.status()}`);
        return `Loaded (HTTP ${response.status()})`;
      },
    },
    // STEP 2: Product Page
    {
      name: 'Product Page Load',
      run: async () => {
        const response = await page.goto(site.testProductUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (response.status() >= 400) throw new Error(`HTTP ${response.status()}`);
        const btn = page.locator('button.single_add_to_cart_button, .add_to_cart_button, [name="add-to-cart"], button:has-text("Add to cart"), button:has-text("Add to Cart")');
        await btn.first().waitFor({ state: 'visible', timeout: 15000 });
        return 'Product page loaded with Add to Cart button';
      },
    },
    // STEP 3: Add to Cart
    {
      name: 'Add to Cart',
      run: async () => {
        const variation = await selectVariations(page);
        await clickAddToCart(page);
        const cartSuccess = page.locator('.woocommerce-message, .added_to_cart, .cart-count, .wc-forward');
        await Promise.race([
          cartSuccess.first().waitFor({ timeout: 15000 }).catch(() => null),
          page.waitForURL('**/cart/**', { timeout: 15000 }).catch(() => null),
          page.waitForTimeout(10000),
        ]);
        return variation ? `Added to cart (variation: ${variation})` : 'Added to cart';
      },
    },
    // STEP 4: Cart Page
    {
      name: 'Cart Page',
      run: async () => {
        await page.goto(site.cartUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const cartItem = page.locator('.cart_item, .woocommerce-cart-form__cart-item, .product-name');
        await cartItem.first().waitFor({ state: 'visible', timeout: 15000 });
        const checkoutBtn = page.locator('.checkout-button, a:has-text("Proceed to checkout"), a:has-text("Proceed to Checkout"), .wc-proceed-to-checkout a');
        await checkoutBtn.first().waitFor({ state: 'visible', timeout: 10000 });
        return 'Cart has items with checkout button';
      },
    },
    // STEP 5: Checkout Page (STOP before iPay88)
    {
      name: 'Checkout Page',
      run: async () => {
        await page.goto(site.checkoutUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const form = page.locator('form.checkout, form.woocommerce-checkout, #customer_details');
        await form.first().waitFor({ state: 'visible', timeout: 15000 });

        // Fill billing fields
        const fields = [
          { sel: '#billing_first_name', val: TEST_CUSTOMER.firstName },
          { sel: '#billing_last_name', val: TEST_CUSTOMER.lastName },
          { sel: '#billing_email', val: TEST_CUSTOMER.email },
          { sel: '#billing_phone', val: TEST_CUSTOMER.phone },
          { sel: '#billing_address_1', val: TEST_CUSTOMER.address1 },
          { sel: '#billing_city', val: TEST_CUSTOMER.city },
          { sel: '#billing_postcode', val: TEST_CUSTOMER.postcode },
        ];
        for (const f of fields) {
          const el = page.locator(f.sel);
          if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
            await el.fill(f.val);
          }
        }

        // Try selecting state
        const stateEl = page.locator('#billing_state');
        if (await stateEl.isVisible({ timeout: 2000 }).catch(() => false)) {
          const tag = await stateEl.evaluate(el => el.tagName.toLowerCase());
          if (tag === 'select') await stateEl.selectOption({ index: 1 }).catch(() => {});
          else await stateEl.fill('Kuala Lumpur').catch(() => {});
        }

        await page.waitForTimeout(2000);

        // Verify payment section & Place Order button
        const payment = page.locator('#payment, .woocommerce-checkout-payment, .payment_methods');
        await payment.first().waitFor({ state: 'visible', timeout: 15000 });

        const placeOrder = page.locator('#place_order, button:has-text("Place order"), button:has-text("Place Order")');
        await placeOrder.first().waitFor({ state: 'visible', timeout: 10000 });

        // STOP — do NOT click Place Order
        return 'Checkout functional — stopped before iPay88 payment';
      },
    },
  ];

  for (const step of steps) {
    const stepStart = Date.now();
    const stepResult = {
      name: step.name,
      status: 'passed',
      message: '',
      screenshot: null,
      duration: 0,
    };

    try {
      stepResult.message = await step.run();
      stepResult.status = 'passed';
    } catch (error) {
      stepResult.status = 'failed';
      stepResult.message = error.message || 'Unknown error';
      stepResult.screenshot = await takeScreenshot(page, site.name, step.name.replace(/\s+/g, '-'), 'FAIL');
      result.overallStatus = 'failed';
    }

    stepResult.duration = Date.now() - stepStart;
    result.steps.push(stepResult);

    // If a step fails, take screenshot of final step and stop
    if (stepResult.status === 'failed') {
      console.log(`  ❌ [${site.name}] ${step.name}: ${stepResult.message}`);
      break;
    } else {
      console.log(`  ✅ [${site.name}] ${step.name}: ${stepResult.message}`);
    }
  }

  result.duration = Date.now() - startTime;
  await browser.close();
  return result;
}

// --- Main: Run all sites and save results ------------------------------------
async function runAllTests() {
  console.log(`\n========================================`);
  console.log(`  Checkout Monitor - ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}`);
  console.log(`========================================\n`);

  const results = {
    timestamp: new Date().toISOString(),
    sites: [],
    summary: { total: 0, passed: 0, failed: 0 },
  };

  for (const site of SITES) {
    console.log(`Testing: ${site.name} (${site.baseUrl})`);
    const siteResult = await testSite(site);
    results.sites.push(siteResult);

    results.summary.total++;
    if (siteResult.overallStatus === 'passed') results.summary.passed++;
    else results.summary.failed++;
  }

  // Save current results
  const resultsFile = path.join(RESULTS_DIR, 'latest-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

  // Append to history (keep last 90 days)
  const historyFile = path.join(RESULTS_DIR, 'history.json');
  let history = [];
  if (fs.existsSync(historyFile)) {
    history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
  }
  history.unshift(results);
  // Keep last 90 entries
  if (history.length > 90) history = history.slice(0, 90);
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

  console.log(`\n========================================`);
  console.log(`  Results: ${results.summary.passed}/${results.summary.total} sites passed`);
  console.log(`========================================\n`);

  return results;
}

module.exports = { runAllTests, SITES };

// Run directly if called from CLI
if (require.main === module) {
  runAllTests().then(results => {
    process.exit(results.summary.failed > 0 ? 1 : 0);
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
