const { Markup } = require('telegraf');
const { loadAppointmentData, saveAppointmentData } = require('../utils/dataHandler');

// View all slots
const viewSlots = async (ctx) => {
  const appointmentData = await loadAppointmentData();
  const slots = appointmentData.slots;

  if (slots.length === 0) {
    return ctx.reply('هیچ نوبتی تعریف نشده است.');
  }

  let response = 'لیست نوبت ها:\n';
  slots.forEach((slot, index) => {
    response += `${index + 1}. تاریخ: ${slot.date}, زمان: ${slot.time}, وضعیت: ${slot.available ? 'موجود' : 'رزرو شده'}\n`;
  });
  ctx.reply(response);
};

// Edit a slot
const editSlot = async (ctx) => {
  const appointmentData = await loadAppointmentData();
  const slots = appointmentData.slots;

  if (slots.length === 0) {
    return ctx.reply('هیچ نوبتی برای ویرایش موجود نیست.');
  }

  // Ask the admin to select the slot to edit
  await ctx.reply('لطفا شماره زمان مورد نظر برای ویرایش را وارد کنید:', Markup.removeKeyboard());
  
  // Listen for slot number input
  ctx.session.editStep = 'awaitingSlotNumber';  // Set session step to track the flow

  ctx.telegram.once('message', async (msgCtx) => {
    if (ctx.session.editStep === 'awaitingSlotNumber') {
      const slotNumber = parseInt(msgCtx.text, 10) - 1;
      if (slotNumber >= 0 && slotNumber < slots.length) {
        ctx.session.slotNumber = slotNumber;  // Store selected slot number
        await ctx.reply('نوبت جدید را وارد کنید (مثال: 10:00 AM, 11 مهر):');

        ctx.session.editStep = 'awaitingNewTime';  // Update step for the next input

        ctx.telegram.once('message', async (msgCtx) => {
          if (ctx.session.editStep === 'awaitingNewTime') {
            const slotInput = msgCtx.text.split(', ');
            if (slotInput.length !== 2) {
              return ctx.reply('فرمت ورودی نادرست است. لطفا زمان و تاریخ را به صورت صحیح وارد کنید.');
            }
            const [time, date] = slotInput;

            // Update the slot data
            slots[ctx.session.slotNumber].time = time;
            slots[ctx.session.slotNumber].date = date;
            await saveAppointmentData(appointmentData);

            await ctx.reply('نوبت با موفقیت ویرایش شد.');
            ctx.session = null;  // Clear session data after completion
          }
        });
      } else {
        await ctx.reply('نوبت وارد شده معتبر نیست.');
        ctx.session = null;  // Clear session if invalid selection
      }
    }
  });
};

// Delete a slot
const deleteSlot = async (ctx) => {
  const appointmentData = await loadAppointmentData();
  const slots = appointmentData.slots;

  if (slots.length === 0) {
    return ctx.reply('هیچ نوبتی برای حذف موجود نیست.');
  }

  // Ask the admin to select the slot to delete
  await ctx.reply('لطفا شماره نوبت مورد نظر برای حذف را وارد کنید:');
  ctx.session.deleteStep = 'awaitingSlotNumber';  // Set session step to track the flow

  ctx.telegram.once('message', async (msgCtx) => {
    if (ctx.session.deleteStep === 'awaitingSlotNumber') {
      const slotNumber = parseInt(msgCtx.text, 10) - 1;
      if (slotNumber >= 0 && slotNumber < slots.length) {
        slots.splice(slotNumber, 1);  // Remove the selected slot
        await saveAppointmentData(appointmentData);
        await ctx.reply('نوبت با موفقیت حذف شد.');
        ctx.session = null;  // Clear session data after completion
      } else {
        await ctx.reply('نوبت وارد شده معتبر نیست.');
        ctx.session = null;  // Clear session if invalid selection
      }
    }
  });
};

module.exports = {
  viewSlots,
  editSlot,
  deleteSlot
};
