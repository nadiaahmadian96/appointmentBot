const { Markup } = require('telegraf');
const { ADMIN_ID } = require('../config'); // Adjust the path based on your project structure

async function sendMainMenu(ctx) {
  // Check if ctx.from and ctx.from.id are defined
  if (!ctx.from || !ctx.from.id) {
    console.error('ctx.from or ctx.from.id is undefined.');
    return;
  }

  const isAdmin = ctx.from.id.toString() === ADMIN_ID;
  let menuOptions;

  if (isAdmin) {
    menuOptions = [
      ['مدیریت زمان ها', 'مدیریت کاربران'],
      ['مدیریت نوبت ها', 'مدیریت درخواست ها'],
    ];
  } else {
    menuOptions = [
      ['ثبت نام', 'رزرو نوبت'],
      ['ویرایش اطلاعات', 'نوبت های پیشین'],
    ];
  }

  // Send the main menu
  return await ctx.reply(
    'لطفا گزینه‌ای را انتخاب کنید:',
    Markup.keyboard(menuOptions).resize() // Persistent reply keyboard
  );
}

module.exports = { sendMainMenu };
