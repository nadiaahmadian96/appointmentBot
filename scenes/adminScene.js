const { Scenes, Markup } = require('telegraf');
const { loadAppointmentData, saveAppointmentData } = require('../utils/dataHandler');
const { sendMainMenu } = require('../utils/menu'); // Import sendMainMenu
const { ADMIN_ID } = require('../config'); // Import ADMIN_ID

const createAdminScene = (ADMIN_ID) => {
  const adminScene = new Scenes.WizardScene(
    'adminScene',
    async (ctx) => {
      // Step 1: Verify admin access and show options
      if (ctx.from.id.toString() !== ADMIN_ID) {
        await ctx.reply('فقط مدیر می‌تواند به این بخش دسترسی داشته باشد.');
        return ctx.scene.leave();
      }

      // Use reply keyboard here for the admin actions
      await ctx.reply(
        'لطفا یک عملیات انتخاب کنید:',
        Markup.keyboard([
          ['افزودن نوبت', 'حذف نوبت'],
          ['بازگشت']
        ]).resize()
      );
      return ctx.wizard.next();
    },
    // Step 2: Handle action selection
    async (ctx) => {
      const action = ctx.message?.text || ctx.callbackQuery?.data;

      // Handle "بازگشت"
      if (action === 'بازگشت') {
        await ctx.reply('به منوی اصلی بازگشتید.', Markup.removeKeyboard());
        await sendMainMenu(ctx);  // Re-send the main menu
        return ctx.scene.leave();
      }

      ctx.wizard.state.selectedAction = action;

      if (action === 'افزودن نوبت') {
        await ctx.reply('لطفا تاریخ و زمان نوبت را وارد کنید (مثال: ۱ فروردین ساعت ۱۴:۰۰):');
        return ctx.wizard.next();
      } else if (action === 'حذف نوبت') {
        await ctx.reply('لطفا تاریخ زمان‌هایی که می‌خواهید حذف کنید را وارد کنید (مثال: ۱ فروردین):');
        return ctx.wizard.next();
      } else {
        await ctx.reply('عملیات نامعتبر است.');
        await sendMainMenu(ctx);  // Re-send the main menu
        return ctx.scene.leave();
      }
    },
    // Step 3: Handle input based on selected action
    async (ctx) => {
      const action = ctx.wizard.state.selectedAction;

      if (ctx.message?.text === 'بازگشت') {
        await ctx.reply('به منوی اصلی بازگشتید.', Markup.removeKeyboard());
        await sendMainMenu(ctx);  // Re-send the main menu
        return ctx.scene.leave();
      }

      if (action === 'افزودن نوبت') {
        const slotInput = ctx.message?.text.split(' ساعت ');
        if (!slotInput || slotInput.length !== 2) {
          await ctx.reply(
            'فرمت ورودی نادرست است. لطفا زمان و تاریخ را به صورت صحیح وارد کنید. (مثال: ۱ فروردین ساعت ۱۶:۰۰)'
          );
          return;
        }
        const [date, time] = slotInput;
        const newSlot = { time, date, available: true };

        try {
          const appointmentData = await loadAppointmentData();

          // Initialize slots array if undefined
          if (!appointmentData.slots) {
            appointmentData.slots = [];
          }

          // Check if the slot already exists
          const slotExists = appointmentData.slots.some(
            slot => slot.date === date && slot.time === time
          );

          if (slotExists) {
            await ctx.reply(`زمان نوبت ${date} ساعت ${time} قبلاً ثبت شده است.`);
          } else {
            appointmentData.slots.push(newSlot);
            await saveAppointmentData(appointmentData);
            await ctx.reply(`زمان نوبت ${date} ساعت ${time} ثبت شد.`);
          }
        } catch (error) {
          console.error('Error adding new slot:', error);
          await ctx.reply('متاسفانه خطایی رخ داده است. لطفا بعدا تلاش کنید.');
        }

        // Remove custom keyboard, send success message, and send main menu
        await ctx.reply('عملیات انجام شد.', Markup.removeKeyboard());
        await sendMainMenu(ctx);  // Re-send the main menu
        await ctx.scene.leave();
        return;
      } else if (action === 'حذف نوبت') {
        const date = ctx.message?.text.trim();
        try {
          const appointmentData = await loadAppointmentData();

          // Initialize slots array if undefined
          if (!appointmentData.slots) {
            appointmentData.slots = [];
          }

          const initialSlotCount = appointmentData.slots.length;

          appointmentData.slots = appointmentData.slots.filter(slot => slot.date !== date);

          const deletedSlotCount = initialSlotCount - appointmentData.slots.length;

          if (deletedSlotCount > 0) {
            await saveAppointmentData(appointmentData);
            await ctx.reply(`تمام زمان‌های مربوط به تاریخ ${date} حذف شدند.`);
          } else {
            await ctx.reply(`هیچ زمانی برای تاریخ ${date} یافت نشد.`);
          }
        } catch (error) {
          console.error('Error deleting slots:', error);
          await ctx.reply('متاسفانه خطایی رخ داده است. لطفا بعدا تلاش کنید.');
        }

        // Remove custom keyboard, send success message, and send main menu
        await ctx.reply('عملیات انجام شد.', Markup.removeKeyboard());
        await sendMainMenu(ctx);  // Re-send the main menu
        await ctx.scene.leave();
        return;
      }
    }
  );

  // Handle 'بازگشت' action at any point in the scene
  adminScene.hears('بازگشت', async (ctx) => {
    // Handle back action
    await ctx.reply('به منوی اصلی بازگشتید.', Markup.removeKeyboard());
    await sendMainMenu(ctx);  // Re-send the main menu
    await ctx.scene.leave();
  });

  // On scene leave, ensure you await sendMainMenu
  adminScene.on('leave', async (ctx) => {
    // Ensure the main menu is sent when the admin leaves the scene
    await sendMainMenu(ctx);
  });

  return adminScene;
};

module.exports = createAdminScene;
