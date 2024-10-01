const { Scenes, Markup } = require('telegraf');
const { loadAppointmentData, saveAppointmentData } = require('../utils/dataHandler');
const { sendMainMenu } = require('../utils/menu');

const registrationScene = new Scenes.WizardScene(
  'registrationScene',
  async (ctx) => {
    await ctx.reply('لطفا نام خود را وارد کنید:', Markup.keyboard([['بازگشت']]).resize());
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message.text === 'بازگشت') {
      await ctx.reply('عملیات لغو شد.', Markup.removeKeyboard());
      await sendMainMenu(ctx); // Re-send the main menu to the user
      return ctx.scene.leave();
    }
    ctx.wizard.state.firstName = ctx.message.text;
    await ctx.reply('لطفا نام خانوادگی خود را وارد کنید:', Markup.keyboard([['بازگشت']]).resize());
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message.text === 'بازگشت') {
      await ctx.reply('عملیات لغو شد.', Markup.removeKeyboard());
      await sendMainMenu(ctx); // Re-send the main menu to the user
      return ctx.scene.leave();
    }
    ctx.wizard.state.lastName = ctx.message.text;
    await ctx.reply('لطفا شماره ملی خود را وارد کنید:', Markup.keyboard([['بازگشت']]).resize());
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message.text === 'بازگشت') {
      await ctx.reply('عملیات لغو شد.', Markup.removeKeyboard());
      await sendMainMenu(ctx); // Re-send the main menu to the user
      return ctx.scene.leave();
    }
    ctx.wizard.state.idNumber = ctx.message.text;
    await ctx.reply('لطفا شماره تماس خود را وارد کنید:', Markup.keyboard([['بازگشت']]).resize());
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message.text === 'بازگشت') {
      await ctx.reply('عملیات لغو شد.', Markup.removeKeyboard());
      await sendMainMenu(ctx); // Re-send the main menu to the user
      return ctx.scene.leave();
    }
    ctx.wizard.state.phoneNumber = ctx.message.text;

    // Save the user's data
    try {
      const appointmentData = await loadAppointmentData();

      // Check if the user is already registered
      const existingUser = appointmentData.users.find(user => user.userId === ctx.from.id);
      if (existingUser) {
        await ctx.reply('شما قبلاً ثبت نام کرده‌اید.');
      } else {
        const user = {
          userId: ctx.from.id,
          firstName: ctx.wizard.state.firstName,
          lastName: ctx.wizard.state.lastName,
          idNumber: ctx.wizard.state.idNumber,
          phoneNumber: ctx.wizard.state.phoneNumber,
        };
        appointmentData.users.push(user);
        await saveAppointmentData(appointmentData);
        await ctx.reply('ثبت نام شما با موفقیت انجام شد.');
      }
    } catch (error) {
      console.error('Error saving user data:', error);
      await ctx.reply('متاسفانه خطایی رخ داده است. لطفا بعدا تلاش کنید.');
    }

    await ctx.reply('عملیات ثبت نام تکمیل شد.', Markup.removeKeyboard());
    await sendMainMenu(ctx); // Re-send the main menu to the user
    await ctx.scene.leave();
  }
);

// Handle 'بازگشت' action at any point in the scene
registrationScene.hears('بازگشت', async (ctx) => {
  await ctx.reply('عملیات لغو شد.', Markup.removeKeyboard());
  await sendMainMenu(ctx); // Re-send the main menu to the user
  await ctx.scene.leave();
});

// Ensure the main menu is sent after the scene is left
registrationScene.on('leave', async (ctx) => {
  await sendMainMenu(ctx);
});

module.exports = registrationScene;
