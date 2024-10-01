const { Scenes, Markup } = require('telegraf');
const { loadAppointmentData, saveAppointmentData } = require('../utils/dataHandler');
const { sendMainMenu } = require('../utils/menu');

const editDetailsScene = new Scenes.WizardScene(
  'editDetailsScene',
  async (ctx) => {
    await ctx.reply('لطفا نام جدید خود را وارد کنید:', Markup.keyboard([['بازگشت']]).resize());
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message.text === 'بازگشت') {
      await ctx.reply('عملیات لغو شد.', Markup.removeKeyboard());
      await sendMainMenu(ctx); // Re-send the main menu to the user
      return ctx.scene.leave();
    }
    ctx.wizard.state.firstName = ctx.message.text;
    await ctx.reply('لطفا نام خانوادگی جدید خود را وارد کنید:', Markup.keyboard([['بازگشت']]).resize());
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message.text === 'بازگشت') {
      await ctx.reply('عملیات لغو شد.', Markup.removeKeyboard());
      await sendMainMenu(ctx); // Re-send the main menu to the user
      return ctx.scene.leave();
    }
    ctx.wizard.state.lastName = ctx.message.text;
    await ctx.reply('لطفا شماره ملی جدید خود را وارد کنید:', Markup.keyboard([['بازگشت']]).resize());
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message.text === 'بازگشت') {
      await ctx.reply('عملیات لغو شد.', Markup.removeKeyboard());
      await sendMainMenu(ctx); // Re-send the main menu to the user
      return ctx.scene.leave();
    }
    ctx.wizard.state.idNumber = ctx.message.text;
    await ctx.reply('لطفا شماره تماس جدید خود را وارد کنید:', Markup.keyboard([['بازگشت']]).resize());
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message.text === 'بازگشت') {
      await ctx.reply('عملیات لغو شد.', Markup.removeKeyboard());
      await sendMainMenu(ctx); // Re-send the main menu to the user
      return ctx.scene.leave();
    }
    ctx.wizard.state.phoneNumber = ctx.message.text;

    // Update the user's data
    try {
      const appointmentData = await loadAppointmentData();
      const user = appointmentData.users.find(user => user.userId === ctx.from.id);
      if (user) {
        user.firstName = ctx.wizard.state.firstName;
        user.lastName = ctx.wizard.state.lastName;
        user.idNumber = ctx.wizard.state.idNumber;
        user.phoneNumber = ctx.wizard.state.phoneNumber;
        await saveAppointmentData(appointmentData);
        await ctx.reply('اطلاعات شما با موفقیت به‌روزرسانی شد.');
      } else {
        await ctx.reply('کاربری یافت نشد. لطفا ابتدا ثبت نام کنید.');
      }
    } catch (error) {
      console.error('Error updating user data:', error);
      await ctx.reply('متاسفانه خطایی رخ داده است. لطفا بعدا تلاش کنید.');
    }

    await ctx.reply('عملیات به‌روزرسانی اطلاعات تکمیل شد.', Markup.removeKeyboard());
    await sendMainMenu(ctx); // Re-send the main menu to the user
    await ctx.scene.leave();
  }
);

// Handle 'بازگشت' action at any point in the scene
editDetailsScene.hears('بازگشت', async (ctx) => {
  await ctx.reply('عملیات لغو شد.', Markup.removeKeyboard());
  await sendMainMenu(ctx); // Re-send the main menu to the user
  await ctx.scene.leave();
});

// On scene leave, send the main menu
editDetailsScene.on('leave', async (ctx) => {
  await sendMainMenu(ctx);
});

module.exports = editDetailsScene;
