const { Scenes, Markup } = require('telegraf');
const { loadAppointmentData, saveAppointmentData } = require('../utils/dataHandler');
const { sendMainMenu } = require('../utils/menu'); // Import sendMainMenu

const createAdminRejectScene = () => {
  const adminRejectScene = new Scenes.WizardScene(
    'adminRejectScene',
    async (ctx) => {
      const appointmentId = ctx.scene.state.appointmentId;

      if (!appointmentId) {
        await ctx.reply('شناسه نوبت نامعتبر است.');
        return ctx.scene.leave();
      }

      ctx.wizard.state.appointmentId = appointmentId;

      await ctx.reply('لطفا دلیل رد نوبت را وارد کنید:', Markup.keyboard([['بازگشت']]).resize());
      return ctx.wizard.next();
    },
    async (ctx) => {
      if (ctx.message.text === 'بازگشت') {
        await ctx.reply('عملیات لغو شد.', Markup.removeKeyboard());
        await sendMainMenu(ctx); // Re-send main menu to the admin
        return ctx.scene.leave();
      }

      const reason = ctx.message.text;
      const appointmentId = ctx.wizard.state.appointmentId;

      const appointmentData = await loadAppointmentData();

      // Find the appointment and mark it as rejected
      const appointment = appointmentData.appointments.find(
        app => app.appointmentId && app.appointmentId.toString() === appointmentId && app.status === 'pending'
      );

      if (appointment) {
        appointment.status = 'rejected';
        appointment.rejectionReason = reason;
        await saveAppointmentData(appointmentData);

        // Notify the user
        await ctx.telegram.sendMessage(
          appointment.userId,
          `نوبت شما برای ${appointment.timeSlot.date} ساعت ${appointment.timeSlot.time} رد شد.\nدلیل: ${reason}`
        );

        await ctx.reply('رد نوبت ثبت شد.', Markup.removeKeyboard());

        // Send main menu to user after rejection
        await ctx.telegram.sendMessage(appointment.userId, 'لطفا گزینه‌ای را انتخاب کنید:', Markup.keyboard([
          ['ثبت نام', 'رزرو نوبت', 'ویرایش اطلاعات']
        ]).resize());
      } else {
        await ctx.reply('نوبتی یافت نشد یا قبلاً بررسی شده است.', Markup.removeKeyboard());
      }

      // Return to the admin's main menu
      await sendMainMenu(ctx);
      return ctx.scene.leave();
    }
  );

  // Handle 'بازگشت' action at any point in the scene
  adminRejectScene.hears('بازگشت', async (ctx) => {
    await ctx.reply('عملیات لغو شد.', Markup.removeKeyboard());
    await sendMainMenu(ctx); // Re-send main menu to the admin
    await ctx.scene.leave();
  });

  return adminRejectScene;
};

module.exports = createAdminRejectScene;
